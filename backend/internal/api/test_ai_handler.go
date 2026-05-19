package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"ai-resume-backend/internal/ai"

	"github.com/gin-gonic/gin"
)

type testAIRequest struct {
	ProviderBaseURL string `json:"providerBaseUrl"`
	APIKey          string `json:"apiKey"`
	Model           string `json:"model"`
}

func TestAIHandler(ctx *gin.Context) {
	var req testAIRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "请求格式不正确"})
		return
	}

	baseURL := strings.TrimRight(strings.TrimSpace(req.ProviderBaseURL), "/")
	apiKey := strings.TrimSpace(req.APIKey)
	model := strings.TrimSpace(req.Model)

	if baseURL == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "AI Base URL 不能为空"})
		return
	}
	if apiKey == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "API Key 不能为空"})
		return
	}
	if model == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "模型不能为空"})
		return
	}

	testCtx, cancel := context.WithTimeout(ctx.Request.Context(), 30*time.Second)
	defer cancel()

	client := ai.NewClient(baseURL, apiKey, model)
	if err := client.TestConnection(testCtx); err != nil {
		ctx.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
}
