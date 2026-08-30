import { query } from "../db/client";
import { normalizeEmployerName, STACK_MATCH_SCORE_THRESHOLD, isAllowedLocation } from "../config/constants";
import { scrapeJobs } from "./apifyService";
import { matchH1bSponsor, detectSponsorshipDisclaimer } from "./lcaMatcher";
import { scoreStackMatch } from "./stackMatcher";
import { generateTailoredResume, ProfileForGeneration } from "./claudeService";
import { renderResumeHtml } from "./resumeRenderer";
import { renderResumePdf, renderResumeDocx } from "./documentExportService";
import { sendDigestEmail } from "./emailService";

interface ProfileRow extends ProfileForGeneration {
  id: number;
}

interface JobRow {
  id: number;
  status: string;
}

export interface DigestRunOptions {
  profileLabel: string;
  searchKeywords: string;
  searchLocation: string;
  limit?: number;
  targetMatches?: number;
}

export interface DigestRunSummary {
  scraped: number;
  alreadyProcessed: number;
  rejected: number;
  matched: number;
  failed: number;
}

export async function runDigest(options: DigestRunOptions): Promise<DigestRunSummary> {
  const { profileLabel, searchKeywords, searchLocation, limit = 10, targetMatches = Infinity } = options;

  const profiles = await query<ProfileRow>(
    "SELECT * FROM profile WHERE profile_label = $1",
    [profileLabel]
  );
  const profile = profiles[0];
  if (!profile) throw new Error(`No profile found with label "${profileLabel}"`);

  const scrapedJobs = await scrapeJobs(searchKeywords, searchLocation, limit);

  const summary: DigestRunSummary = { scraped: scrapedJobs.length, alreadyProcessed: 0, rejected: 0, matched: 0, failed: 0 };
  const today = new Date().toISOString().slice(0, 10);

  for (const job of scrapedJobs) {
    if (summary.matched >= targetMatches) break;

    const companyNormalized = normalizeEmployerName(job.company);

    const existing = await query<JobRow>("SELECT id, status FROM jobs WHERE external_id = $1", [
      job.externalId,
    ]);

    if (existing.length > 0 && existing[0].status === "digested") {
      summary.alreadyProcessed++;
      continue;
    }

    const jobText = `${job.title}\n${job.description}`;
    const disclaimer = detectSponsorshipDisclaimer(jobText);
    const h1bMatch = disclaimer.explicitlyNoSponsorship
      ? { isMatch: false, confidence: 0, matchedEmployerName: null }
      : await matchH1bSponsor(job.company);
    const sponsorshipOk =
      !disclaimer.explicitlyNoSponsorship && (h1bMatch.isMatch || disclaimer.explicitlySponsors);

    const stackMatch = scoreStackMatch(jobText, profile.target_stack);
    const stackOk = stackMatch.score >= STACK_MATCH_SCORE_THRESHOLD;

    const locationOk = isAllowedLocation(job.location);

    const isMatch = sponsorshipOk && stackOk && locationOk;

    const upserted = await query<JobRow>(
      `INSERT INTO jobs
        (external_id, title, company, company_normalized, location, description, url, posted_date,
         stack_match_score, h1b_match, h1b_match_confidence, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (external_id) DO UPDATE SET
         stack_match_score = EXCLUDED.stack_match_score,
         h1b_match = EXCLUDED.h1b_match,
         h1b_match_confidence = EXCLUDED.h1b_match_confidence,
         status = EXCLUDED.status
       RETURNING id, status`,
      [
        job.externalId,
        job.title,
        job.company,
        companyNormalized,
        job.location,
        job.description,
        job.url,
        job.postedDate,
        stackMatch.score,
        h1bMatch.isMatch || disclaimer.explicitlySponsors,
        h1bMatch.confidence,
        isMatch ? "matched" : "rejected",
      ]
    );
    const jobId = upserted[0].id;

    if (!isMatch) {
      summary.rejected++;
      continue;
    }

    try {
      const structuredResume = await generateTailoredResume(profile, job.description);
      const html = renderResumeHtml(structuredResume);
      const [pdfBuffer, docxBuffer] = await Promise.all([
        renderResumePdf(html),
        renderResumeDocx(structuredResume),
      ]);

      await query(
        `INSERT INTO applications (job_id, profile_id, resume_text, digest_date)
         VALUES ($1, $2, $3, $4)`,
        [jobId, profile.id, JSON.stringify(structuredResume), today]
      );

      const emailHtml = `
        <h2>${job.title} at ${job.company}</h2>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>LinkedIn:</strong> <a href="${job.url}">${job.url}</a></p>
        <p><strong>Stack match:</strong> ${(stackMatch.score * 100).toFixed(0)}% (${stackMatch.matchedKeywords.join(", ")})</p>
        <p><strong>H1B signal:</strong> ${h1bMatch.matchedEmployerName ?? (disclaimer.explicitlySponsors ? "job posting states sponsorship available" : "unknown")}</p>
        <hr>
        <pre style="white-space:pre-wrap;font-family:inherit;">${job.description}</pre>
      `;

      await sendDigestEmail(`JobCoPilot: ${job.company} - ${job.title}`, emailHtml, [
        { filename: "resume.pdf", content: pdfBuffer },
        { filename: "resume.docx", content: docxBuffer },
      ]);

      await query("UPDATE jobs SET status = 'digested' WHERE id = $1", [jobId]);

      summary.matched++;
    } catch (err) {
      console.error(`Failed to process matched job "${job.title}" at ${job.company}:`, err);
      summary.failed++;
      // leave status as 'matched' (not 'digested') so a future run retries this job
      await query("UPDATE jobs SET status = 'matched' WHERE id = $1", [jobId]);
    }
  }

  return summary;
}
