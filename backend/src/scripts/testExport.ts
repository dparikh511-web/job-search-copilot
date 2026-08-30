import fs from "fs";
import path from "path";
import { renderResumeHtml } from "../services/resumeRenderer";
import { renderResumePdf, renderResumeDocx } from "../services/documentExportService";
import { sampleResume } from "./sampleResume";

async function main() {
  const html = renderResumeHtml(sampleResume);

  const outDir = path.join(__dirname, "..", "..", "output");
  fs.mkdirSync(outDir, { recursive: true });

  const pdfBuffer = await renderResumePdf(html);
  fs.writeFileSync(path.join(outDir, "resume-preview.pdf"), pdfBuffer);
  console.log("PDF saved to:", path.join(outDir, "resume-preview.pdf"));

  const docxBuffer = await renderResumeDocx(sampleResume);
  fs.writeFileSync(path.join(outDir, "resume-preview.docx"), docxBuffer);
  console.log("DOCX saved to:", path.join(outDir, "resume-preview.docx"));
}

main();
