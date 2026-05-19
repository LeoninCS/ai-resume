# AI Resume

一个 AI 简历制作与修改网站 MVP。左侧聊天栏用于和 AI 对话，右侧实时显示 A4 HTML 简历，AI 可以自由修改整份简历 HTML 结构，支持版本历史、HTML 导出、浏览器打印 PDF，并在前端配置 API。

## Docker 启动

```bash
docker compose up -d --build
```

启动后访问：

```txt
前端：http://localhost:5174
后端：http://localhost:18081
```

健康检查：

```txt
GET http://localhost:18081/api/health
```

停止：

```bash
docker compose down
```

## 前端配置 API

打开前端后点击右上角「API 设置」，填写：

```txt
AI Base URL：https://api.openai.com/v1
API Key：你的 Key
模型：gpt-4o-mini
```

也可以填写其他兼容 OpenAI 的服务地址。图片聊天需要使用支持视觉输入的模型。

API Key 留空时，后端会返回演示修改结果，方便先看完整交互。

## 已实现

- 左侧聊天栏
- 聊天图片上传，支持简历截图、证书、作品图作为 AI 参考
- 右侧 A4 HTML 简历预览，可直接编辑文字
- 自由 HTML 简历结构，AI 可改模块、双栏、时间线、侧栏、标签和视觉层级
- 前端 API 设置
- Go Gin `/api/chat`
- 兼容 OpenAI 的 AI 调用
- AI 改动确认卡片
- 版本历史与回滚
- 导出 HTML
- 浏览器打印 PDF
- 本地保存和刷新恢复

## 技术栈

- 前端：React + TypeScript + Vite + Lucide icons
- 后端：Go + Gin
- AI 接口：兼容 OpenAI Chat Completions 的 `/chat/completions`
- 本地存储：浏览器 `localStorage`

## 目录

```txt
frontend/   # 简历工作台
backend/    # Go + Gin API
docs/       # 产品规格与 UI/UX 交互文档
```

## 本地开发

启动后端：

```bash
cd backend
go run ./cmd/server
```

默认地址：

```txt
http://localhost:8081
```

启动前端：

```bash
cd frontend
npm install
npm run dev
```

默认地址：

```txt
http://localhost:5173
```

## 构建检查

```bash
cd frontend
npm run build

cd ../backend
go test ./...
```
