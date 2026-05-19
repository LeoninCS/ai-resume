import type { ApiConfig, ResumeData, ResumeStyle } from "./types";

export const defaultResume: ResumeData = {
  id: "resume-local",
  title: "我的简历",
  html: `<style>
  .free-resume {
    color: #111827;
    font-family: Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
  }
  .free-resume h1 {
    margin: 0;
    font-size: 25pt;
    line-height: 1.1;
  }
  .free-resume .headline {
    margin-top: 6px;
    color: #2563eb;
    font-weight: 700;
  }
  .free-resume .contact {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin-top: 9px;
    color: #64748b;
  }
  .free-resume .summary {
    margin: 14px 0 0;
  }
  .free-resume section {
    margin-top: 14px;
  }
  .free-resume h2 {
    margin: 0 0 8px;
    border-bottom: 1px solid #2563eb;
    color: #2563eb;
    font-size: 14pt;
  }
  .free-resume article {
    margin-top: 8px;
  }
  .free-resume .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .free-resume .muted {
    color: #64748b;
  }
  .free-resume ul {
    margin: 4px 0 0 18px;
    padding: 0;
  }
</style>
<div class="free-resume">
  <header>
    <h1>你的姓名</h1>
    <div class="headline">一句话定位你的优势</div>
    <div class="contact">
      <span>电话</span>
      <span>邮箱</span>
      <span>城市</span>
      <span>个人链接</span>
    </div>
    <p class="summary">点击文字可以直接修改，也可以让 AI 根据你的经历重写整份简历。</p>
  </header>
  <section>
    <h2>核心优势</h2>
    <ul>
      <li>用 1-2 条结果导向的表达概括你的关键能力。</li>
      <li>突出与目标机会相关的工具、经验和成果。</li>
    </ul>
  </section>
  <section>
    <h2>项目经历</h2>
    <article>
      <div class="row">
        <strong>项目名称</strong>
        <span class="muted">时间</span>
      </div>
      <div class="muted">角色 / 技术栈 / 场景</div>
      <ul>
        <li>描述你做了什么、怎么做、带来了什么结果。</li>
      </ul>
    </article>
  </section>
</div>`,
  targetRole: "",
  basics: {
    name: "你的姓名",
    phone: "",
    email: "",
    location: "",
    links: []
  },
  summary: "",
  sections: [
    { id: "education", type: "education", title: "教育经历", items: [] },
    { id: "experience", type: "experience", title: "工作经历", items: [] },
    { id: "projects", type: "projects", title: "项目经历", items: [] },
    { id: "skills", type: "skills", title: "技能", items: [] }
  ]
};

export const defaultStyle: ResumeStyle = {
  templateId: "classic-a4",
  page: {
    size: "A4",
    marginMm: 16
  },
  typography: {
    fontFamily: "Arial, sans-serif",
    baseFontSize: 10.5,
    headingFontSize: 14,
    lineHeight: 1.45
  },
  layout: {
    columns: 1,
    sectionSpacing: 12,
    itemSpacing: 8
  },
  colors: {
    text: "#1f2937",
    muted: "#6b7280",
    accent: "#2563eb"
  }
};

export const defaultApiConfig: ApiConfig = {
  providerBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini"
};

export const starterMessages = [
  {
    id: "welcome",
    role: "assistant" as const,
    content: "告诉我你的经历，或直接说你想怎么改。我可以重写文案，也可以直接改整份简历的 HTML 结构和版式。",
    createdAt: new Date().toISOString(),
    status: "done" as const
  }
];
