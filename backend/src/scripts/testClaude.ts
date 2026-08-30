import "dotenv/config";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db/client";
import { renderResumeHtml, StructuredResume } from "../services/resumeRenderer";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProfileRow {
  id: number;
  name: string;
  master_resume_text: string;
  skills: string[];
  experience: unknown;
  target_stack: string[];
}

const jobDescription = `Confido is the AI infrastructure powering modern CPG — the platform that 200+ brands like OLIPOP, Simple Mills, Dr. Squatch, and Tropicana use to run everything from deductions to production planning. Finance, accounting, sales, and operations, unified in one system for the first time.


We're growing 5x year over year with a small team in New York City; the people who join now will shape the product, the culture, and the company itself.

If you want your work on shelves everywhere — and outsized ownership while you build — we'd love to meet you.

As a Software Engineer, you will help build the core product and platform systems that power Confido. You'll work across the stack to ship new features, improve core infrastructure, and turn complex financial workflows into intuitive software.

Location: New York, NY (Relocation supported)

What You'll Do

* Build product features and platform systems across the stack
* Develop backend services and APIs that power financial workflows and analytics
* Implement AI-powered workflows for document processing and data extraction
* Design intuitive product experiences that simplify complex financial data
* Work closely with product and engineering to ship high-impact features quickly

Example Problems

* AI-powered ingestion of invoices, deductions, and retailer reports
* Scaling systems that ingest financial data from multiple retailer sources
* Building analytics and forecasting tools for CPG brands
* Designing product experiences that turn financial data into actionable insights

Required

What We're Looking For

* 2+ years of software engineering experience
* Strong programming fundamentals and backend development skills
* Ability to build and ship production software
* Interest in solving complex operational and data problems

Nice to Have

* Experience working with AI/ML-powered systems
* Experience with data pipelines or analytics systems
* Strong communication skills and comfort collaborating across teams
* Interest in early-stage startups and high-ownership environments
* CS degree or equivalent experience

Compensation Range: $200K - $230K`;

async function main() {
  const profiles = await query<ProfileRow>(
    "SELECT * FROM profile WHERE profile_label = $1",
    ["Mobile Developer"]
  );
  const profile = profiles[0];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    system: `You are an expert technical resume writer. Given a candidate's background and a job description, produce a tailored resume. The resume has to look professional and not read as AI-written.

    Summary: 45-55 words. If the most recent role spans multiple areas of work (e.g. frontend and backend), split it into labeled sub-sections like the reference resume below (e.g. "Frontend:" and "Backend:", each with their own bullets) instead of one flat list — 7-8 bullets under the primary sub-section, 2-3 under the secondary one, 18-24 words each. Older/shorter role: 2-3 bullet points at 15-20 words each. Skills: categorized into labeled lines by type (e.g. Programming Languages, Frameworks and Libraries, Databases, DevOps and Tools, AI Tools), matching the reference resume's categories, not one flat comma-separated line. Total resume body should be 400-480 words.

    Don't use the Oxford comma before "and" in a list — write "confirm the item, add payment and take signature," not "confirm the item, add payment, and take signature." Don't use em-dashes ("—").

    Here is the candidate's full existing resume. Use it as a structural and formatting template — match its bullet density, section organization, and skills categorization — but re-tailor the actual content, emphasis, and wording to fit the job description below. Do not copy bullets verbatim; pull the underlying facts and re-express them for this role:
    ${profile.master_resume_text}

    Do not use buzzwords: "leverage," "utilize," "seamless," "robust," "cutting-edge," "dynamic," "synergy," "spearheaded."

    Respond with ONLY valid JSON in this exact shape, no markdown formatting or code fences, no extra fields:
    {
      "name": "...",
      "contact": "...",
      "summary": "...",
      "skills": [{ "category": "...", "items": ["...", "..."] }],
      "experience": [
        {
          "title": "...",
          "company": "...",
          "location": "...",
          "dates": "...",
          "sections": [{ "label": "..." (or null if this role has no sub-sections), "bullets": ["...", "..."] }]
        }
      ],
      "education": [{ "school": "...", "degree": "...", "date": "...", "gpa": "..." }]
    }`,
    messages: [
      { role: "user", content: `Candidate profile:\n${JSON.stringify(profile)}\n\nJob description:\n${jobDescription}` }
    ],
  });

  response.content.forEach(con => {
    if (con.type === 'text') {
      const structuredResume: StructuredResume = JSON.parse(con.text);
      const html = renderResumeHtml(structuredResume);

      const outDir = path.join(__dirname, "..", "..", "output");
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, "resume-preview.html");
      fs.writeFileSync(outPath, html);

      console.log("Resume saved to:", outPath);
    }
  });
}

main();
