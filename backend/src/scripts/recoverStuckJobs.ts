import "dotenv/config";
import { query } from "../db/client";
import { scoreStackMatch } from "../services/stackMatcher";
import { matchH1bSponsor, detectSponsorshipDisclaimer } from "../services/lcaMatcher";
import { generateApplicationMaterials, ProfileForGeneration } from "../services/claudeService";
import { renderResumeHtml } from "../services/resumeRenderer";
import { renderResumePdf, renderResumeDocx } from "../services/documentExportService";
import { sendDigestEmail } from "../services/emailService";

interface StuckJob {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  stack_match_score: number | null;
}

interface ProfileRow extends ProfileForGeneration {
  id: number;
  profile_label: string;
}

function pickProfile(job: StuckJob, profiles: ProfileRow[]): ProfileRow {
  // stack_match_score can't disambiguate here -- both profiles' target_stack lists score
  // identically against most job text. The two daily searches are keyword-differentiated
  // instead ("Mobile Application Developer Ionic Angular" vs "Software Engineer Full Stack"),
  // so use the job title as the signal for which search most likely surfaced it.
  const isMobileTitle = /mobile/i.test(job.title);
  const mobileProfile = profiles.find((p) => p.profile_label === "Mobile Developer");
  const softwareProfile = profiles.find((p) => p.profile_label === "Software Developer");
  if (isMobileTitle && mobileProfile) return mobileProfile;
  return softwareProfile ?? profiles[0];
}

async function main() {
  const stuckJobs = await query<StuckJob>(
    "SELECT id, title, company, location, description, url, stack_match_score FROM jobs WHERE status = 'matched' ORDER BY scraped_at"
  );
  const profiles = await query<ProfileRow>("SELECT * FROM profile");

  console.log(`Found ${stuckJobs.length} stuck job(s).`);
  const today = new Date().toISOString().slice(0, 10);

  let recovered = 0;
  let failed = 0;

  for (const job of stuckJobs) {
    const profile = pickProfile(job, profiles);
    console.log(`\n[${job.id}] ${job.title} at ${job.company} -> profile "${profile.profile_label}"`);

    try {
      const jobText = `${job.title}\n${job.description}`;
      const disclaimer = detectSponsorshipDisclaimer(jobText);
      const h1bMatch = disclaimer.explicitlyNoSponsorship
        ? { isMatch: false, confidence: 0, matchedEmployerName: null }
        : await matchH1bSponsor(job.company);
      const stackMatch = scoreStackMatch(jobText, profile.target_stack);

      const { resume: structuredResume, coverLetter } = await generateApplicationMaterials(profile, job.description);
      const html = renderResumeHtml(structuredResume);
      const [pdfBuffer, docxBuffer] = await Promise.all([
        renderResumePdf(html),
        renderResumeDocx(structuredResume),
      ]);

      await query(
        `INSERT INTO applications (job_id, profile_id, resume_text, cover_letter_text, digest_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [job.id, profile.id, JSON.stringify(structuredResume), coverLetter, today]
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

      await query("UPDATE jobs SET status = 'digested' WHERE id = $1", [job.id]);
      console.log(`  recovered.`);
      recovered++;
    } catch (err) {
      console.error(`  failed:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Recovered ${recovered}, failed ${failed}, total ${stuckJobs.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
