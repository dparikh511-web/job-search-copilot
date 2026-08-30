export interface ResumeSkillCategory {
  category: string;
  items: string[];
}

export interface ResumeSection {
  label: string | null;
  bullets: string[];
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  sections: ResumeSection[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  date: string;
  gpa?: string;
}

export interface ResumeProject {
  name: string;
  bullets: string[];
}

export interface StructuredResume {
  name: string;
  contact: string;
  summary: string;
  skills: ResumeSkillCategory[];
  experience: ResumeExperience[];
  projects?: ResumeProject[];
  education: ResumeEducation[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderExperience(exp: ResumeExperience): string {
  const sectionsHtml = exp.sections
    .map((section) => {
      const label = section.label
        ? `<div class="sub-label">${escapeHtml(section.label)}</div>`
        : "";
      const bullets = section.bullets
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("\n");
      return `${label}<ul>${bullets}</ul>`;
    })
    .join("\n");

  return `
    <div class="job">
      <div class="job-title">${escapeHtml(exp.title)} | ${escapeHtml(exp.company)} | ${escapeHtml(exp.location)} | ${escapeHtml(exp.dates)}</div>
      ${sectionsHtml}
    </div>`;
}

function renderSkillLine(skill: ResumeSkillCategory): string {
  return `<div class="skill-line"><span class="skill-category">${escapeHtml(skill.category)}:</span> ${escapeHtml(skill.items.join(", "))}</div>`;
}

function renderProject(project: ResumeProject): string {
  const bullets = project.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n");
  return `
    <div class="job">
      <div class="job-title">${escapeHtml(project.name)}</div>
      <ul>${bullets}</ul>
    </div>`;
}

function renderEducation(edu: ResumeEducation): string {
  const gpa = edu.gpa ? `, GPA: ${escapeHtml(edu.gpa)}` : "";
  return `<div class="edu-line"><strong>${escapeHtml(edu.school)}</strong> - ${escapeHtml(edu.degree)}, ${escapeHtml(edu.date)}${gpa}</div>`;
}

export function renderResumeHtml(resume: StructuredResume): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(resume.name)} - Resume</title>
<style>
  @page { size: letter; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ddd;
  }
  body {
    font-family: Carlito, Calibri, Arial, sans-serif;
  }
  #page {
    width: 816px;
    min-height: 1056px;
    margin: 0 auto;
    background: white;
    box-shadow: 0 0 8px rgba(0,0,0,0.3);
    box-sizing: border-box;
    padding: 48px 56px;
    font-size: 14px; /* 10.5pt at 96dpi - the "body" size */
    line-height: 1.35em;
  }
  h1 {
    text-align: center;
    font-size: 1.6em;
    margin: 0 0 0.15em;
  }
  .contact {
    text-align: center;
    font-size: 0.9em;
    margin-bottom: 0.8em;
  }
  .section-title {
    font-weight: 700;
    font-size: 1.333em; /* 14pt - "header" */
    border-bottom: 1.5px solid #000;
    margin: 0.7em 0 0.3em;
    padding-bottom: 0.1em;
  }
  p.summary { margin: 0; }
  .skill-line { margin: 0.15em 0; }
  .skill-category { font-weight: 700; }
  .job-title { font-weight: 700; font-size: 1.143em; margin-top: 0.5em; } /* 12pt - "sub header" */
  .sub-label { font-weight: 700; font-size: 1.143em; margin: 0.35em 0 0.1em 1em; } /* 12pt - "sub header" */
  ul { margin: 0.15em 0 0.15em 1.2em; padding: 0; }
  li { margin: 0.12em 0; }
  .edu-line { margin: 0.15em 0; }
  #print-hint {
    text-align: center;
    color: #666;
    font-family: Arial, sans-serif;
    font-size: 13px;
    margin: 12px 0;
  }
  @media print {
    body { background: white; }
    #page { box-shadow: none; }
    #print-hint { display: none; }
  }
</style>
</head>
<body>
<div id="print-hint">Press Cmd+P (or Ctrl+P) and "Save as PDF" to export this as a one-page PDF.</div>
<div id="page">
  <h1>${escapeHtml(resume.name)}</h1>
  <div class="contact">${escapeHtml(resume.contact)}</div>

  <div class="section-title">Summary</div>
  <p class="summary">${escapeHtml(resume.summary)}</p>

  <div class="section-title">Technical Skills</div>
  ${resume.skills.map(renderSkillLine).join("\n")}

  <div class="section-title">Work Experience</div>
  ${resume.experience.map(renderExperience).join("\n")}

  ${resume.projects && resume.projects.length > 0 ? `<div class="section-title">Projects</div>${resume.projects.map(renderProject).join("\n")}` : ""}

  <div class="section-title">Education</div>
  ${resume.education.map(renderEducation).join("\n")}
</div>
<script>
  // Shrink-to-fit: if #page's content overflows one printed page (1056px tall),
  // reduce the base font-size in small steps until it fits, down to a readable floor.
  (function shrinkToFit() {
    var page = document.getElementById("page");
    var targetHeight = 1056;
    var fontSize = 14;
    var minFontSize = 11;

    while (page.scrollHeight > targetHeight && fontSize > minFontSize) {
      fontSize -= 0.25;
      page.style.fontSize = fontSize + "px";
    }
  })();
</script>
</body>
</html>`;
}
