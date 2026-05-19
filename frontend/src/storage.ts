import { defaultApiConfig, defaultResume, defaultStyle, starterMessages } from "./defaults";
import { renderResumeHtml } from "./resumeRenderer";
import type { ApiConfig, ChatMessage, ResumeData, ResumeStyle, VersionRecord } from "./types";

const keys = {
  resume: "ai-resume.resume",
  style: "ai-resume.style",
  versions: "ai-resume.versions",
  messages: "ai-resume.messages",
  api: "ai-resume.api"
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadResume(): ResumeData {
  const resume = { ...defaultResume, ...readJson(keys.resume, defaultResume) };
  if (!resume.html) {
    resume.html = renderResumeHtml(resume, loadStyle());
  }
  return resume;
}

export function saveResume(resume: ResumeData) {
  localStorage.setItem(keys.resume, JSON.stringify(resume));
}

export function loadStyle(): ResumeStyle {
  return readJson(keys.style, defaultStyle);
}

export function saveStyle(style: ResumeStyle) {
  localStorage.setItem(keys.style, JSON.stringify(style));
}

export function loadVersions(): VersionRecord[] {
  return readJson(keys.versions, []);
}

export function saveVersions(versions: VersionRecord[]) {
  localStorage.setItem(keys.versions, JSON.stringify(versions));
}

export function loadMessages(): ChatMessage[] {
  return readJson(keys.messages, starterMessages);
}

export function saveMessages(messages: ChatMessage[]) {
  localStorage.setItem(
    keys.messages,
    JSON.stringify(
      messages.map((message) => {
        const attachments = message.attachments
          ?.map((attachment) => ({
            ...attachment,
            dataUrl: ""
          }))
          .filter((attachment) => attachment.name);
        return {
          ...message,
          attachments: attachments?.length ? attachments : undefined
        };
      })
    )
  );
}

export function loadApiConfig(): ApiConfig {
  return { ...defaultApiConfig, ...readJson(keys.api, defaultApiConfig) };
}

export function saveApiConfig(config: ApiConfig) {
  localStorage.setItem(keys.api, JSON.stringify(config));
}

export function resetAll() {
  Object.values(keys).forEach((key) => localStorage.removeItem(key));
}
