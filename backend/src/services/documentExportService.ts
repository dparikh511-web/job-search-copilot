import puppeteer from "puppeteer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from "docx";
import { StructuredResume } from "./resumeRenderer";

export async function renderResumePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });
    await page.setContent(html, { waitUntil: "load" });
    const pdfBytes = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// Font sizes are in half-points (docx convention): 21 = 10.5pt, 32 = 16pt, etc.
const BODY_SIZE = 21; // 10.5pt - "font"
const NAME_SIZE = 32;
const CONTACT_SIZE = 21; // 10.5pt
const SECTION_TITLE_SIZE = 28; // 14pt - "header"
const SUB_HEADER_SIZE = 24; // 12pt - "sub header" (job title lines, Frontend:/Backend: labels)
const FONT_FAMILY = "Calibri";
const PAGE_MARGIN_TWIPS = 576; // 0.4 inch (1440 twips per inch)

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 70 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    },
    children: [new TextRun({ text, bold: true, size: SECTION_TITLE_SIZE })],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: BODY_SIZE })],
  });
}

function buildResumeDocument(resume: StructuredResume): Document {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: resume.name, bold: true, size: NAME_SIZE })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: resume.contact, size: CONTACT_SIZE })],
    })
  );

  children.push(sectionTitle("Summary"));
  children.push(
    new Paragraph({
      spacing: { after: 70 },
      children: [new TextRun({ text: resume.summary, size: BODY_SIZE })],
    })
  );

  children.push(sectionTitle("Technical Skills"));
  for (const skill of resume.skills) {
    children.push(
      new Paragraph({
        spacing: { after: 25 },
        children: [
          new TextRun({ text: `${skill.category}: `, bold: true, size: BODY_SIZE }),
          new TextRun({ text: skill.items.join(", "), size: BODY_SIZE }),
        ],
      })
    );
  }

  children.push(sectionTitle("Work Experience"));
  for (const exp of resume.experience) {
    children.push(
      new Paragraph({
        spacing: { before: 70, after: 25 },
        children: [
          new TextRun({
            text: `${exp.title} | ${exp.company} | ${exp.location} | ${exp.dates}`,
            bold: true,
            size: SUB_HEADER_SIZE,
          }),
        ],
      })
    );
    for (const section of exp.sections) {
      if (section.label) {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 40, after: 15 },
            children: [new TextRun({ text: section.label, bold: true, size: SUB_HEADER_SIZE })],
          })
        );
      }
      for (const bullet of section.bullets) {
        children.push(bulletParagraph(bullet));
      }
    }
  }

  if (resume.projects && resume.projects.length > 0) {
    children.push(sectionTitle("Projects"));
    for (const project of resume.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 25 },
          children: [new TextRun({ text: project.name, bold: true, size: SUB_HEADER_SIZE })],
        })
      );
      for (const bullet of project.bullets) {
        children.push(bulletParagraph(bullet));
      }
    }
  }

  children.push(sectionTitle("Education"));
  for (const edu of resume.education) {
    const gpa = edu.gpa ? `, GPA: ${edu.gpa}` : "";
    children.push(
      new Paragraph({
        spacing: { after: 25 },
        children: [
          new TextRun({ text: `${edu.school} - `, bold: true, size: BODY_SIZE }),
          new TextRun({ text: `${edu.degree}, ${edu.date}${gpa}`, size: BODY_SIZE }),
        ],
      })
    );
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_FAMILY },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN_TWIPS,
              bottom: PAGE_MARGIN_TWIPS,
              left: PAGE_MARGIN_TWIPS,
              right: PAGE_MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  });
}

export async function renderResumeDocx(resume: StructuredResume): Promise<Buffer> {
  const doc = buildResumeDocument(resume);
  return Packer.toBuffer(doc);
}
