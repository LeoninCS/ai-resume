package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"ai-resume-backend/internal/ai"
	"ai-resume-backend/internal/resume"

	"github.com/gin-gonic/gin"
)

type chatRequest struct {
	Prompt          string             `json:"prompt"`
	ResumeJSON      resume.ResumeData  `json:"resumeJson"`
	StyleJSON       resume.ResumeStyle `json:"styleJson"`
	Images          []ai.ImageInput    `json:"images"`
	ProviderBaseURL string             `json:"providerBaseUrl"`
	APIKey          string             `json:"apiKey"`
	Model           string             `json:"model"`
}

type chatResponse struct {
	ChangeSummary string             `json:"changeSummary"`
	ResumeJSON    resume.ResumeData  `json:"resumeJson"`
	StyleJSON     resume.ResumeStyle `json:"styleJson"`
}

func ChatHandler(ctx *gin.Context) {
	var req chatRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "请求格式不正确"})
		return
	}
	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" && len(req.Images) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "prompt 或图片不能为空"})
		return
	}
	if prompt == "" {
		prompt = "请根据图片内容修改简历"
	}

	if strings.TrimSpace(req.APIKey) == "" {
		nextResume, nextStyle, summary := resume.DemoApply(prompt, req.ResumeJSON, req.StyleJSON)
		ctx.JSON(http.StatusOK, chatResponse{
			ChangeSummary: summary,
			ResumeJSON:    nextResume,
			StyleJSON:     nextStyle,
		})
		return
	}

	baseURL := strings.TrimRight(strings.TrimSpace(req.ProviderBaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	model := strings.TrimSpace(req.Model)
	if model == "" {
		model = "gpt-4o-mini"
	}

	callCtx, cancel := context.WithTimeout(ctx.Request.Context(), 120*time.Second)
	defer cancel()

	client := ai.NewClient(baseURL, strings.TrimSpace(req.APIKey), model)
	result, err := client.GenerateResumeChange(callCtx, ai.ResumeChangeInput{
		Prompt: prompt,
		Resume: req.ResumeJSON,
		Style:  req.StyleJSON,
		Images: req.Images,
	})
	if err != nil {
		ctx.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	if result.ChangeSummary == "" {
		result.ChangeSummary = "已根据你的要求生成修改计划。"
	}
	if result.ResumeJSON.ID == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": "AI 返回的 resumeJson 不完整"})
		return
	}
	if strings.TrimSpace(result.ResumeJSON.HTML) == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": "AI 返回的 resumeJson.html 为空"})
		return
	}
	if result.StyleJSON.TemplateID == "" {
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": "AI 返回的 styleJson 不完整"})
		return
	}

	ctx.JSON(http.StatusOK, chatResponse{
		ChangeSummary: result.ChangeSummary,
		ResumeJSON:    result.ResumeJSON,
		StyleJSON:     result.StyleJSON,
	})
}
