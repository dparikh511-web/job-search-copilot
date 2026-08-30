import fs from "fs";
import path from "path";
import { renderResumeHtml } from "../services/resumeRenderer";
import { sampleResume } from "./sampleResume";

const html = renderResumeHtml(sampleResume);
const outDir = path.join(__dirname, "..", "..", "output");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "resume-preview.html");
fs.writeFileSync(outPath, html);

console.log("Resume saved to:", outPath);
