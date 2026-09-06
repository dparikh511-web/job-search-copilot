import { Router } from "express";
import { query } from "../db/client";
import { renderResumeHtml, renderCoverLetterHtml, StructuredResume } from "../services/resumeRenderer";
import { renderResumePdf, renderResumeDocx } from "../services/documentExportService";
import { asyncHandler } from "./asyncHandler";

export const applicationsRouter = Router();

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

interface ApplicationRow {
  id: number;
  job_id: number;
  profile_id: number;
  resume_text: string;
  cover_letter_text: string | null;
  digest_date: string;
  generated_at: string;
}

applicationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const jobId = req.query.jobId;
    const rows = jobId
      ? await query<ApplicationRow>("SELECT * FROM applications WHERE job_id = $1 ORDER BY id DESC", [jobId])
      : await query<ApplicationRow>("SELECT * FROM applications ORDER BY id DESC");

    res.json(
      rows.map((row) => ({
        ...row,
        resume: JSON.parse(row.resume_text) as StructuredResume,
      }))
    );
  })
);

async function loadApplication(id: string): Promise<ApplicationRow | null> {
  const rows = await query<ApplicationRow>("SELECT * FROM applications WHERE id = $1", [id]);
  return rows[0] ?? null;
}

applicationsRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req.params.id);
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const resume = JSON.parse(application.resume_text) as StructuredResume;
    const html = renderResumeHtml(resume);
    const pdfBuffer = await renderResumePdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", contentDisposition(`${resume.name}.pdf`));
    res.send(pdfBuffer);
  })
);

applicationsRouter.get(
  "/:id/docx",
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req.params.id);
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const resume = JSON.parse(application.resume_text) as StructuredResume;
    const docxBuffer = await renderResumeDocx(resume);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", contentDisposition(`${resume.name}.docx`));
    res.send(docxBuffer);
  })
);

applicationsRouter.get(
  "/:id/coverletter/pdf",
  asyncHandler(async (req, res) => {
    const application = await loadApplication(req.params.id);
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    if (!application.cover_letter_text) {
      res.status(404).json({ error: "No cover letter generated for this application" });
      return;
    }
    const resume = JSON.parse(application.resume_text) as StructuredResume;
    const html = renderCoverLetterHtml(resume.name, resume.contact, application.cover_letter_text);
    const pdfBuffer = await renderResumePdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", contentDisposition(`${resume.name} Coverletter.pdf`));
    res.send(pdfBuffer);
  })
);
