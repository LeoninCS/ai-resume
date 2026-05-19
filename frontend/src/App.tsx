import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  ImagePlus,
  Loader2,
  RotateCcw,
  Send,
  Settings,
  X
} from "lucide-react";
import { defaultApiConfig, defaultResume, defaultStyle, starterMessages } from "./defaults";
import { EditableResume } from "./EditableResume";
import { downloadFile, renderFullHtml, renderResumeHtml } from "./resumeRenderer";
import {
  loadApiConfig,
  loadMessages,
  loadResume,
  loadStyle,
  loadVersions,
  resetAll,
  saveApiConfig,
  saveMessages,
  saveResume,
  saveStyle,
  saveVersions
} from "./storage";
import type { AIChange, ApiConfig, ChatAttachment, ChatMessage, ResumeData, ResumeStyle, VersionRecord } from "./types";

type Toast = {
  type: "success" | "error" | "info";
  message: string;
};

type ChatResponse = {
  changeSummary: string;
  resumeJson: ResumeData;
  styleJson: ResumeStyle;
};

const MAX_VERSION_HISTORY = 10;
const MAX_CHAT_IMAGES = 4;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1400;
const IMAGE_EXPORT_QUALITY = 0.82;

type ConnectionTestState = {
  status: "idle" | "testing" | "success" | "error";
  message: string;
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("图片处理失败"));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve({
        id: uid("img"),
        name: file.name,
        mimeType: "image/jpeg",
        dataUrl: canvas.toDataURL("image/jpeg", IMAGE_EXPORT_QUALITY)
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败"));
    };
    image.src = objectUrl;
  });
}

function getBackendUrl() {
  if (window.location.port === "5174") {
    return `${window.location.protocol}//${window.location.hostname}:18081`;
  }
  if (window.location.port === "5173") {
    return `${window.location.protocol}//${window.location.hostname}:8081`;
  }
  return "";
}

export function App() {
  const [resume, setResume] = useState<ResumeData>(() => loadResume());
  const [style, setStyle] = useState<ResumeStyle>(() => loadStyle());
  const [versions, setVersions] = useState<VersionRecord[]>(() => loadVersions());
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => loadApiConfig());
  const [draftConfig, setDraftConfig] = useState<ApiConfig>(() => loadApiConfig());
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<VersionRecord | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoom, setZoom] = useState("fit-page");
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({ status: "idle", message: "" });

  const activeResume = previewVersion?.resumeJson ?? resume;
  const activeStyle = previewVersion?.styleJson ?? style;
  const activeHtml = activeResume.html || renderResumeHtml(activeResume, activeStyle);
  const fullHtml = useMemo(() => renderFullHtml(resume, style), [resume, style]);

  useEffect(() => saveResume(resume), [resume]);
  useEffect(() => saveStyle(style), [style]);
  useEffect(() => saveVersions(versions), [versions]);
  useEffect(() => saveMessages(messages), [messages]);
  useEffect(() => saveApiConfig(apiConfig), [apiConfig]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.type === "error" ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function pushToast(type: Toast["type"], message: string) {
    setToast({ type, message });
  }

  function updateMessages(updater: (current: ChatMessage[]) => ChatMessage[]) {
    setMessages((current) => updater(current));
  }

  async function handleAttachmentFiles(files: FileList | null) {
    if (!files?.length) return;
    await addImageFiles(Array.from(files));
  }

  async function addImageFiles(files: File[]) {
    if (files.length === 0) return;
    const remainingSlots = MAX_CHAT_IMAGES - attachments.length;
    if (remainingSlots <= 0) {
      pushToast("error", `最多上传 ${MAX_CHAT_IMAGES} 张图片`);
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith("image/")) {
        pushToast("error", `${file.name} 需要是图片文件`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        pushToast("error", `${file.name} 超过 5MB`);
        return false;
      }
      return true;
    });

    if (files.length > remainingSlots) {
      pushToast("info", `最多上传 ${MAX_CHAT_IMAGES} 张图片`);
    }
    if (validFiles.length === 0) return;

    try {
      const nextAttachments = await Promise.all(validFiles.map(fileToAttachment));
      setAttachments((current) => [...current, ...nextAttachments].slice(0, MAX_CHAT_IMAGES));
    } catch (error) {
      const message = error instanceof Error ? error.message : "图片读取失败";
      pushToast("error", message);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    void addImageFiles(files);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function sendPrompt(nextPrompt?: string) {
    const content = (nextPrompt ?? prompt).trim();
    const currentAttachments = nextPrompt ? [] : attachments;
    if (!content && currentAttachments.length === 0) {
      pushToast("error", "请输入修改要求或上传图片");
      return;
    }

    const createdAt = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: content || "请根据图片内容修改简历",
      createdAt,
      status: "done",
      attachments: currentAttachments
    };
    const assistantId = uid("msg");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: currentAttachments.length > 0 ? "正在分析图片并生成修改计划" : "正在生成修改计划",
      createdAt,
      status: "pending"
    };

    if (!nextPrompt) {
      setPrompt("");
      setAttachments([]);
    }
    setIsSending(true);
    updateMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch(`${getBackendUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          resumeJson: resume,
          styleJson: style,
          images: currentAttachments.map(({ name, mimeType, dataUrl }) => ({ name, mimeType, dataUrl })),
          providerBaseUrl: cleanBaseUrl(apiConfig.providerBaseUrl),
          apiKey: apiConfig.apiKey,
          model: apiConfig.model
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `请求失败：${response.status}`);
      }

      const data = (await response.json()) as ChatResponse;
      const change: AIChange = {
        changeSummary: data.changeSummary,
        resumeJson: data.resumeJson,
        styleJson: data.styleJson
      };

      updateMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: data.changeSummary,
                status: "done",
                change
              }
            : message
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败";
      updateMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: message,
                status: "failed"
              }
            : item
        )
      );
      pushToast("error", message);
    } finally {
      setIsSending(false);
    }
  }

  function applyChange(message: ChatMessage) {
    if (!message.change) return;
    setIsApplying(true);
    window.setTimeout(() => {
      const nextResume = message.change!.resumeJson;
      const nextStyle = message.change!.styleJson;
      setResume(nextResume);
      setStyle(nextStyle);
      setPreviewVersion(null);

      const version: VersionRecord = {
        id: uid("version"),
        createdAt: new Date().toISOString(),
        userPrompt: findPreviousUserPrompt(message.id),
        changeSummary: message.change!.changeSummary,
        resumeJson: nextResume,
        styleJson: nextStyle,
        htmlSnapshot: renderFullHtml(nextResume, nextStyle)
      };
      setVersions((current) => [version, ...current].slice(0, MAX_VERSION_HISTORY));
      updateMessages((current) => [
        ...current,
        {
          id: uid("msg"),
          role: "system",
          content: "修改已应用",
          createdAt: new Date().toISOString(),
          status: "done"
        }
      ]);
      setIsApplying(false);
      pushToast("success", "修改已应用");
    }, 240);
  }

  function findPreviousUserPrompt(messageId: string) {
    const index = messages.findIndex((message) => message.id === messageId);
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "手动修改";
  }

  function restoreVersion(version: VersionRecord) {
    setResume(version.resumeJson);
    setStyle(version.styleJson);
    setPreviewVersion(null);
    setVersionsOpen(false);
    const restoreRecord: VersionRecord = {
      ...version,
      id: uid("version"),
      createdAt: new Date().toISOString(),
      userPrompt: "恢复历史版本",
      changeSummary: `恢复到 ${formatTime(version.createdAt)} 的版本`
    };
    setVersions((current) => [restoreRecord, ...current].slice(0, MAX_VERSION_HISTORY));
    pushToast("success", "已恢复到所选版本");
  }

  function exportHtml() {
    downloadFile(`${resume.title || "我的简历"}.html`, fullHtml, "text/html;charset=utf-8");
    pushToast("success", "HTML 已下载");
  }

  function exportPdfByPrint() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      pushToast("error", "浏览器拦截了打印窗口");
      return;
    }
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
  }

  function saveSettings() {
    const next = {
      ...draftConfig,
      providerBaseUrl: cleanBaseUrl(draftConfig.providerBaseUrl)
    };
    setApiConfig(next);
    setSettingsOpen(false);
    pushToast("success", "API 设置已保存");
  }

  async function testAIConnection() {
    const payload = {
      providerBaseUrl: cleanBaseUrl(draftConfig.providerBaseUrl),
      apiKey: draftConfig.apiKey,
      model: draftConfig.model.trim()
    };

    setConnectionTest({ status: "testing", message: "正在测试连接..." });

    try {
      const response = await fetch(`${getBackendUrl()}/api/test-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `测试失败：${response.status}`);
      }

      setConnectionTest({ status: "success", message: "连接成功，配置可用。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "测试失败";
      setConnectionTest({ status: "error", message });
    }
  }

  function clearWorkspace() {
    resetAll();
    setResume(defaultResume);
    setStyle(defaultStyle);
    setVersions([]);
    setMessages(starterMessages);
    setApiConfig(defaultApiConfig);
    setDraftConfig(defaultApiConfig);
    setPreviewVersion(null);
    pushToast("info", "已重置工作台");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">AI 简历编辑器</div>
          <input
            className="title-input"
            value={resume.title}
            onChange={(event) => setResume({ ...resume, title: event.target.value })}
            aria-label="简历标题"
          />
        </div>
        <div className="save-state">
          <CheckCircle2 size={16} />
          已保存
        </div>
        <div className="top-actions">
          <button
            className="btn ghost"
            onClick={() => {
              setDraftConfig(apiConfig);
              setConnectionTest({ status: "idle", message: "" });
              setSettingsOpen(true);
            }}
          >
            <Settings size={16} />
            API 设置
          </button>
          <button className="btn ghost" onClick={() => setVersionsOpen(true)}>
            <History size={16} />
            历史
          </button>
          <button className="btn secondary" onClick={exportHtml}>
            <FileText size={16} />
            导出 HTML
          </button>
          <button className="btn primary" onClick={exportPdfByPrint}>
            <Download size={16} />
            导出 PDF
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="chat-panel">
          <section className="message-list" aria-label="聊天消息">
            {messages.map((message) => (
              <article key={message.id} className={`message ${message.role}`}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "你" : message.role === "assistant" ? "AI" : "系统"}</span>
                  <time>{formatTime(message.createdAt)}</time>
                </div>
                <div className="bubble">
                  {message.status === "pending" && <Loader2 className="spin inline-icon" size={15} />}
                  {message.status === "failed" && <AlertCircle className="inline-icon error-icon" size={15} />}
                  <span>{message.content}</span>
                </div>
                {message.attachments?.length ? (
                  <div className="message-attachments" aria-label="图片附件">
                    {message.attachments.map((attachment) => (
                      <figure key={attachment.id} className="message-attachment">
                        {attachment.dataUrl && <img src={attachment.dataUrl} alt={attachment.name} />}
                        <figcaption>{attachment.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
                {message.change && (
                  <div className="change-card">
                    <div className="change-title">本次修改计划</div>
                    <p>{message.change.changeSummary}</p>
                    <div className="change-grid">
                      <span>结构</span>
                      <strong>自由 HTML</strong>
                      <span>页面</span>
                      <strong>A4 可编辑</strong>
                    </div>
                    <div className="change-actions">
                      <button className="btn primary" onClick={() => applyChange(message)} disabled={isApplying}>
                        {isApplying ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                        应用修改
                      </button>
                      <button className="btn secondary" onClick={() => sendPrompt(findPreviousUserPrompt(message.id))} disabled={isSending}>
                        <RotateCcw size={16} />
                        重新生成
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="composer">
            <div className="composer-meta">
              <span>Enter 发送，Shift + Enter 换行，支持粘贴图片</span>
              <div className="composer-actions">
                <label className="attach-button">
                  <ImagePlus size={15} />
                  图片
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handleAttachmentFiles(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button onClick={clearWorkspace}>重置</button>
              </div>
            </div>
            <div className="composer-box">
              {attachments.length > 0 && (
                <div className="attachment-preview-list" aria-label="待发送图片">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-preview">
                      <img src={attachment.dataUrl} alt={attachment.name} />
                      <span>{attachment.name}</span>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`移除 ${attachment.name}`}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendPrompt();
                  }
                }}
                placeholder="输入修改要求，或粘贴/上传简历截图、证书、作品图让 AI 参考"
              />
              <button className="send-button" onClick={() => void sendPrompt()} disabled={isSending}>
                {isSending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </section>
        </aside>

        <div className="splitter" aria-hidden="true" />

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div className="toolbar-group">
              <select value={zoom} onChange={(event) => setZoom(event.target.value)} aria-label="缩放">
                <option value="fit-page">适合页面</option>
                <option value="fit-width">适合宽度</option>
                <option value="100">100%</option>
                <option value="75">75%</option>
                <option value="50">50%</option>
              </select>
              <span>1 / 1</span>
            </div>
            <div className="toolbar-status">
              {previewVersion ? (
                <>
                  <Clock3 size={15} />
                  正在预览历史版本
                  <button onClick={() => setPreviewVersion(null)}>回到当前版本</button>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  预览已更新
                </>
              )}
            </div>
          </div>
          <div className={`preview-canvas zoom-${zoom}`}>
            <div className={`paper ${isApplying ? "refreshing" : ""}`} style={{ padding: `${activeStyle.page.marginMm}mm` }}>
              <EditableResume
                html={activeHtml}
                readOnly={Boolean(previewVersion)}
                onChange={(nextHtml) => {
                  setResume((current) => ({ ...current, html: nextHtml }));
                }}
              />
            </div>
          </div>
        </section>
      </main>

      {versionsOpen && (
        <aside className="drawer">
          <div className="drawer-head">
            <div>
              <h2>版本历史</h2>
              <p>{versions.length ? `最近 ${versions.length} 个版本` : "还没有历史版本"}</p>
            </div>
            <button className="icon-btn" onClick={() => setVersionsOpen(false)} aria-label="关闭版本历史">
              <X size={18} />
            </button>
          </div>
          <div className="version-list">
            {versions.length === 0 ? (
              <div className="empty-state">应用一次 AI 修改后，这里会出现版本记录。</div>
            ) : (
              versions.map((version) => (
                <article
                  key={version.id}
                  className={`version-item ${previewVersion?.id === version.id ? "selected" : ""}`}
                  onClick={() => setPreviewVersion(version)}
                >
                  <div className="version-row">
                    <strong>{formatTime(version.createdAt)}</strong>
                    <span>{previewVersion?.id === version.id ? "预览中" : ""}</span>
                  </div>
                  <p>{version.userPrompt}</p>
                  <small>{version.changeSummary}</small>
                  <button
                    className="btn secondary full"
                    onClick={(event) => {
                      event.stopPropagation();
                      restoreVersion(version);
                    }}
                  >
                    恢复此版本
                  </button>
                </article>
              ))
            )}
          </div>
        </aside>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
            <div className="modal-head">
              <div>
                <h2 id="api-settings-title">API 设置</h2>
                <p>配置兼容 OpenAI 的模型服务。</p>
              </div>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)} aria-label="关闭 API 设置">
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              <label>
                AI Base URL
                <input
                  value={draftConfig.providerBaseUrl}
                  onChange={(event) => setDraftConfig({ ...draftConfig, providerBaseUrl: event.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label>
                模型
                <input
                  value={draftConfig.model}
                  onChange={(event) => setDraftConfig({ ...draftConfig, model: event.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </label>
              <label>
                API Key
                <input
                  type="password"
                  value={draftConfig.apiKey}
                  onChange={(event) => setDraftConfig({ ...draftConfig, apiKey: event.target.value })}
                  placeholder="sk-..."
                />
              </label>
              {connectionTest.message && (
                <div className={`connection-test ${connectionTest.status}`}>
                  {connectionTest.status === "testing" && <Loader2 className="spin" size={15} />}
                  {connectionTest.status === "success" && <CheckCircle2 size={15} />}
                  {connectionTest.status === "error" && <AlertCircle size={15} />}
                  <span>{connectionTest.message}</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setDraftConfig(defaultApiConfig)}>
                恢复默认
              </button>
              <button className="btn secondary" onClick={() => void testAIConnection()} disabled={connectionTest.status === "testing"}>
                {connectionTest.status === "testing" ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                测试连接
              </button>
              <button className="btn primary" onClick={saveSettings}>
                保存设置
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
