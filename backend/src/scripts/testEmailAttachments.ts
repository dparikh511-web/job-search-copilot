import "dotenv/config";
import { renderResumeHtml } from "../services/resumeRenderer";
import { renderResumePdf, renderResumeDocx } from "../services/documentExportService";
import { sendDigestEmail } from "../services/emailService";
import { sampleResume } from "./sampleResume";

async function main() {
  const html = renderResumeHtml(sampleResume);
  const pdfBuffer = await renderResumePdf(html);
  const docxBuffer = await renderResumeDocx(sampleResume);

  await sendDigestEmail(
    "Test: Software Engineer at Confido",
    "<p>Job description, company info, and LinkedIn link would go here.</p>",
    [
      { filename: "resume.pdf", content: pdfBuffer },
      { filename: "resume.docx", content: docxBuffer },
    ]
  );

  console.log("Email sent!");
}

main();