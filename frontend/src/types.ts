export type ResumeSectionType = "education" | "experience" | "projects" | "skills" | "custom";

export interface ResumeItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  bullets?: string[];
}

export interface ResumeSection {
  id: string;
  type: ResumeSectionType;
  title: string;
  items: ResumeItem[];
}

export interface ResumeData {
  id: string;
  title: string;
  html: string;
  targetRole: string;
  basics: {
    name: string;
    phone: string;
    email: string;
    location: string;
    links: string[];
  };
  summary: string;
  sections: ResumeSection[];
}

export interface ResumeStyle {
  templateId: string;
  page: {
    size: "A4";
    marginMm: number;
  };
  typography: {
    fontFamily: string;
    baseFontSize: number;
    headingFontSize: number;
    lineHeight: number;
  };
  layout: {
    columns: number;
    sectionSpacing: number;
    itemSpacing: number;
  };
  colors: {
    text: string;
    muted: string;
    accent: string;
  };
}

export interface VersionRecord {
  id: string;
  createdAt: string;
  userPrompt: string;
  changeSummary: string;
  resumeJson: ResumeData;
  styleJson: ResumeStyle;
  htmlSnapshot: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: "pending" | "done" | "failed";
  attachments?: ChatAttachment[];
  change?: AIChange;
}

export interface AIChange {
  changeSummary: string;
  resumeJson: ResumeData;
  styleJson: ResumeStyle;
}

export interface ApiConfig {
  providerBaseUrl: string;
  apiKey: string;
  model: string;
}
