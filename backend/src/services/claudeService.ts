import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { StructuredResume } from "./resumeRenderer";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

export interface ProfileForGeneration {
  name: string;
  master_resume_text: string;
  skills: string[];
  experience: unknown;
  target_stack: string[];
}

async function callClaude(
  profile: ProfileForGeneration,
  jobDescription: string
): Promise<StructuredResume | null> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 16384,
    system: `You are an expert technical resume writer. Given a candidate's background and a job description, produce a tailored resume. The resume has to look professional and not read as AI-written.

    Summary: 45-55 words. If the most recent role spans multiple areas of work (e.g. frontend and backend), split it into labeled sub-sections like the reference resume below (e.g. "Frontend:" and "Backend:", each with their own bullets) instead of one flat list — 7-8 bullets under the primary sub-section, 2-3 under the secondary one, 18-24 words each. Older/shorter role: 2-3 bullet points at 15-20 words each. Skills: categorized into labeled lines by type (e.g. Programming Languages, Frameworks and Libraries, Databases, DevOps and Tools, AI Tools), matching the reference resume's categories, not one flat comma-separated line. Total resume body should be 380-440 words — err toward the lower end when in doubt, since going over costs a page.

    Don't use the Oxford comma before "and" in a list — write "confirm the item, add payment and take signature," not "confirm the item, add payment, and take signature." Don't use em-dashes ("—").

    CRITICAL — factual accuracy: company names, employer locations, employment dates, school names, and degree names must be copied EXACTLY from the reference resume below, even if they differ from the target job's own location, industry, or context. Never infer or change a location/date/name to seem more relevant to the job — only the bullet wording, emphasis, and summary should be re-tailored. A factually wrong resume is worse than a generic one.

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
      "projects": [{ "name": "...", "bullets": ["...", "..."] }],
      "education": [{ "school": "...", "degree": "...", "date": "...", "gpa": "..." }]
    }
    Only include "projects" if the reference resume below has a Projects section. If included, keep it to 2-3 bullets total, 15-20 words each, re-tailored to emphasize whatever is most relevant to the job description — same factual-accuracy rule applies (project name stays exact).`,
    messages: [
      {
        role: "user",
        content: `Candidate profile:\n${JSON.stringify(profile)}\n\nJob description:\n${jobDescription}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    const usage = response.usage as { output_tokens_details?: { thinking_tokens?: number } };
    console.warn(
      `Claude call produced no text block (stop_reason=${response.stop_reason}, thinking_tokens=${usage.output_tokens_details?.thinking_tokens})`
    );
    return null;
  }

  return JSON.parse(textBlock.text) as StructuredResume;
}

/**
 * Claude's adaptive thinking has real variance in length — occasionally it consumes
 * most of the token budget before any output text starts, especially with a long job
 * description. Retry once before giving up, since this is intermittent, not deterministic.
 */
export async function generateTailoredResume(
  profile: ProfileForGeneration,
  jobDescription: string
): Promise<StructuredResume> {
  const first = await callClaude(profile, jobDescription);
  if (first) return first;

  console.warn("Retrying Claude generation once after empty response...");
  const retry = await callClaude(profile, jobDescription);
  if (retry) return retry;

  throw new Error("Claude response did not contain a text block after retry");
}
