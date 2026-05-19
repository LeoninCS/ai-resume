import type { ResumeData, ResumeStyle } from "./types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderResumeHtml(resume: ResumeData, style: ResumeStyle) {
  if (resume.html) {
    return resume.html;
  }

  const contact = [
    resume.basics.phone,
    resume.basics.email,
    resume.basics.location,
    ...resume.basics.links
  ].filter(Boolean);

  const sections = resume.sections
    .map((section) => {
      const items = section.items
        .map((item) => {
          const bullets = (item.bullets ?? [])
            .filter(Boolean)
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join("");
          return `
            <article class="resume-item">
              <div class="item-head">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  ${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ""}
                </div>
                ${item.meta ? `<em>${escapeHtml(item.meta)}</em>` : ""}
              </div>
              ${bullets ? `<ul>${bullets}</ul>` : ""}
            </article>
          `;
        })
        .join("");

      return `
        <section class="resume-section">
          <h2>${escapeHtml(section.title)}</h2>
          ${items || `<p class="empty-line">待补充</p>`}
        </section>
      `;
    })
    .join("");

  return `
    <style>
      .resume-document {
        color: ${style.colors.text};
        font-family: ${style.typography.fontFamily};
        font-size: ${style.typography.baseFontSize}pt;
        line-height: ${style.typography.lineHeight};
      }
      .resume-document h1 {
        margin: 0;
        color: ${style.colors.text};
        font-size: 24pt;
        line-height: 1.1;
      }
      .resume-document .target-role {
        margin-top: 4px;
        color: ${style.colors.accent};
        font-size: 11pt;
        font-weight: 700;
      }
      .resume-document .contact {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 12px;
        margin-top: 8px;
        color: ${style.colors.muted};
      }
      .resume-document .summary {
        margin: 12px 0 0;
      }
      .resume-section {
        margin-top: ${style.layout.sectionSpacing}px;
      }
      .resume-section h2 {
        margin: 0 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid ${style.colors.accent};
        color: ${style.colors.accent};
        font-size: ${style.typography.headingFontSize}pt;
      }
      .resume-item {
        margin-top: ${style.layout.itemSpacing}px;
      }
      .item-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .item-head span {
        display: block;
        color: ${style.colors.muted};
        font-weight: 400;
      }
      .item-head em {
        flex: 0 0 auto;
        color: ${style.colors.muted};
        font-style: normal;
      }
      .resume-document ul {
        margin: 4px 0 0 18px;
        padding: 0;
      }
      .empty-line {
        margin: 0;
        color: ${style.colors.muted};
      }
    </style>
    <div class="resume-document">
      <header>
        <h1>${escapeHtml(resume.basics.name || "你的姓名")}</h1>
        ${resume.targetRole ? `<div class="target-role">${escapeHtml(resume.targetRole)}</div>` : ""}
        ${contact.length ? `<div class="contact">${contact.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        ${resume.summary ? `<p class="summary">${escapeHtml(resume.summary)}</p>` : ""}
      </header>
      ${sections}
    </div>
  `;
}

export function renderFullHtml(resume: ResumeData, style: ResumeStyle) {
  const body = renderResumeHtml(resume, style);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(resume.title)}</title>
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; background: #f8fafc; }
    .page {
      box-sizing: border-box;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${style.page.marginMm}mm;
      background: white;
    }
    .page * { box-sizing: border-box; }
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="page">${body}</main>
</body>
</html>`;
}

export function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
