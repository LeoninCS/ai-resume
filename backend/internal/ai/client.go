package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ai-resume-backend/internal/resume"
)

type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

type ResumeChangeInput struct {
	Prompt string
	Resume resume.ResumeData
	Style  resume.ResumeStyle
	Images []ImageInput
}

type ImageInput struct {
	Name     string `json:"name"`
	MimeType string `json:"mimeType"`
	DataURL  string `json:"dataUrl"`
}

type ResumeChangeResult struct {
	ChangeSummary string             `json:"changeSummary"`
	ResumeJSON    resume.ResumeData  `json:"resumeJson"`
	StyleJSON     resume.ResumeStyle `json:"styleJson"`
}

type chatCompletionRequest struct {
	Model          string         `json:"model"`
	Messages       []chatMessage  `json:"messages"`
	Temperature    float64        `json:"temperature"`
	MaxTokens      int            `json:"max_tokens,omitempty"`
	ResponseFormat responseFormat `json:"response_format"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type contentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *imageURL `json:"image_url,omitempty"`
}

type imageURL struct {
	URL string `json:"url"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func NewClient(baseURL, apiKey, model string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		model:   model,
		http:    http.DefaultClient,
	}
}

func (c *Client) GenerateResumeChange(ctx context.Context, input ResumeChangeInput) (ResumeChangeResult, error) {
	if c.baseURL == "" || c.apiKey == "" || c.model == "" {
		return ResumeChangeResult{}, errors.New("AI 配置不完整")
	}

	type promptResume struct {
		ID         string                 `json:"id"`
		Title      string                 `json:"title"`
		HTML       string                 `json:"html"`
		TargetRole string                 `json:"targetRole"`
		Basics     resume.ResumeBasics    `json:"basics"`
		Summary    string                 `json:"summary"`
		Sections   []resume.ResumeSection `json:"sections,omitempty"`
	}

	currentResume := promptResume{
		ID:         input.Resume.ID,
		Title:      input.Resume.Title,
		HTML:       input.Resume.HTML,
		TargetRole: input.Resume.TargetRole,
		Basics:     input.Resume.Basics,
		Summary:    input.Resume.Summary,
	}
	if strings.TrimSpace(input.Resume.HTML) == "" {
		currentResume.Sections = input.Resume.Sections
	}

	resumeBytes, err := json.Marshal(currentResume)
	if err != nil {
		return ResumeChangeResult{}, fmt.Errorf("序列化 resume.json 失败：%w", err)
	}
	styleBytes, err := json.Marshal(input.Style)
	if err != nil {
		return ResumeChangeResult{}, fmt.Errorf("序列化 style.json 失败：%w", err)
	}

	userText := fmt.Sprintf(`用户提示：
%s

当前 resumeJson：
%s

当前 styleJson：
%s`, input.Prompt, string(resumeBytes), string(styleBytes))
	userContent := any(userText)
	if len(input.Images) > 0 {
		parts := []contentPart{{Type: "text", Text: userText}}
		for _, image := range input.Images {
			if strings.TrimSpace(image.DataURL) == "" {
				continue
			}
			parts = append(parts, contentPart{
				Type:     "image_url",
				ImageURL: &imageURL{URL: image.DataURL},
			})
		}
		userContent = parts
	}

	body := chatCompletionRequest{
		Model:       c.model,
		Temperature: 0.15,
		MaxTokens:   4096,
		ResponseFormat: responseFormat{
			Type: "json_object",
		},
		Messages: []chatMessage{
			{
				Role: "system",
				Content: strings.TrimSpace(`你是一个自由结构的简历网页编辑 AI。你只能返回 JSON 对象，字段固定为 changeSummary、resumeJson、styleJson。

要求：
1. resumeJson.html 是简历主内容，必须返回一段完整 HTML 片段，片段内可以包含 <style> 和任意语义化 HTML。
2. 你可以完全改变简历结构、模块数量、模块名称、视觉层级、网格布局、侧栏、时间线、标签、强调区和版式。
3. HTML 片段会被放进 A4 页面容器中，宽度自适应容器，内容控制在一页内，使用内联 <style> 限定在片段根 class 下。
4. 保留 resumeJson.id 和 resumeJson.title，resumeJson.sections 可以作为兼容字段保留或同步更新。
5. styleJson 只控制 A4 外层页面边距等基础设置，主要版式写进 resumeJson.html。
6. 用户附图时，先读取图片里的简历内容、截图文字、证书信息或排版线索，再结合用户提示更新 HTML。
7. HTML 控制在 9000 个字符以内，CSS 合并简写，避免冗长注释。
8. changeSummary 用中文，一句话说明主要变化。
9. 输出必须是可 JSON.parse 的对象，禁止 Markdown。`),
			},
			{
				Role:    "user",
				Content: userContent,
			},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return ResumeChangeResult{}, fmt.Errorf("构造 AI 请求失败：%w", err)
	}

	data, err := c.doChatCompletion(ctx, payload)
	if err != nil {
		return ResumeChangeResult{}, err
	}

	var completion chatCompletionResponse
	if err := json.Unmarshal(data, &completion); err != nil {
		return ResumeChangeResult{}, fmt.Errorf("解析 AI 响应失败：%w", err)
	}

	if completion.Error != nil {
		return ResumeChangeResult{}, errors.New(completion.Error.Message)
	}
	if len(completion.Choices) == 0 {
		return ResumeChangeResult{}, errors.New("AI 没有返回结果")
	}

	content, ok := completion.Choices[0].Message.Content.(string)
	if !ok {
		return ResumeChangeResult{}, errors.New("AI 返回内容格式不正确")
	}
	var result ResumeChangeResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return ResumeChangeResult{}, fmt.Errorf("AI 返回的 JSON 无法解析：%w", err)
	}

	if result.ChangeSummary == "" {
		result.ChangeSummary = "已根据提示更新简历。"
	}
	if result.ResumeJSON.ID == "" {
		result.ResumeJSON = input.Resume
	}
	if strings.TrimSpace(result.ResumeJSON.HTML) == "" {
		result.ResumeJSON.HTML = input.Resume.HTML
	}
	if result.StyleJSON.TemplateID == "" {
		result.StyleJSON = input.Style
	}

	return result, nil
}

func (c *Client) doChatCompletion(ctx context.Context, payload []byte) ([]byte, error) {
	var lastErr error
	for attempt := 1; attempt <= 3; attempt += 1 {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
		if err != nil {
			return nil, fmt.Errorf("创建 AI 请求失败：%w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.apiKey)

		resp, err := c.http.Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return nil, errors.New("AI 服务超时，请换用响应更快的模型、减少图片数量后重试")
			}
			lastErr = fmt.Errorf("调用 AI 失败：%w", err)
		} else {
			data, readErr := io.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr != nil {
				return nil, fmt.Errorf("读取 AI 响应失败：%w", readErr)
			}
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return data, nil
			}
			if isTransientStatus(resp.StatusCode) && attempt < 3 {
				lastErr = formatAIHTTPError(resp.StatusCode, data, true)
			} else {
				return nil, formatAIHTTPError(resp.StatusCode, data, attempt > 1)
			}
		}

		select {
		case <-time.After(time.Duration(attempt) * 900 * time.Millisecond):
		case <-ctx.Done():
			return nil, errors.New("AI 服务超时，请换用响应更快的模型、减少图片数量后重试")
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("AI 服务暂时无响应，请稍后重试")
}

func isTransientStatus(status int) bool {
	return status == http.StatusRequestTimeout ||
		status == http.StatusBadGateway ||
		status == http.StatusServiceUnavailable ||
		status == http.StatusGatewayTimeout
}

func formatAIHTTPError(status int, data []byte, retried bool) error {
	body := strings.TrimSpace(string(data))
	if body == "" {
		body = http.StatusText(status)
	}
	if status == http.StatusGatewayTimeout || strings.Contains(body, "504") {
		if retried {
			return fmt.Errorf("AI 服务超时（504），已自动重试；请换用响应更快的模型、减少图片数量后重试。上游返回：%s", body)
		}
		return fmt.Errorf("AI 服务超时（504），请换用响应更快的模型、减少图片数量后重试。上游返回：%s", body)
	}
	return fmt.Errorf("AI 响应失败（%d）：%s", status, body)
}

func (c *Client) TestConnection(ctx context.Context) error {
	if c.baseURL == "" || c.apiKey == "" || c.model == "" {
		return errors.New("AI 配置不完整")
	}

	body := chatCompletionRequest{
		Model:       c.model,
		Temperature: 0,
		Messages: []chatMessage{
			{Role: "user", Content: `Reply with "ok".`},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("构造测试请求失败：%w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("创建测试请求失败：%w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("连接 AI 服务失败：%w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取测试响应失败：%w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("AI 服务返回错误：%s", strings.TrimSpace(string(data)))
	}

	var completion chatCompletionResponse
	if err := json.Unmarshal(data, &completion); err != nil {
		return fmt.Errorf("解析测试响应失败：%w", err)
	}
	if completion.Error != nil {
		return errors.New(completion.Error.Message)
	}
	if len(completion.Choices) == 0 {
		return errors.New("AI 服务没有返回结果")
	}

	return nil
}
