package resume

import (
	"fmt"
	"html"
	"strings"
	"time"
)

func DemoApply(prompt string, current ResumeData, style ResumeStyle) (ResumeData, ResumeStyle, string) {
	next := normalizeResume(current)
	nextStyle := normalizeStyle(style)
	lower := strings.ToLower(prompt)

	if next.TargetRole == "" {
		next.TargetRole = inferRole(prompt)
	}
	if strings.Contains(prompt, "生成") || strings.Contains(prompt, "第一版") || isEmptyResume(next) {
		next = fillStarterResume(next, prompt)
	}
	if strings.Contains(prompt, "精简") || strings.Contains(prompt, "一页") {
		next.Summary = "具备清晰问题拆解、快速学习和跨团队协作能力，能够围绕目标岗位交付稳定结果。"
		nextStyle.Typography.BaseFontSize = 10
		nextStyle.Layout.SectionSpacing = 10
	}
	if strings.Contains(prompt, "版式") || strings.Contains(prompt, "排版") {
		nextStyle.Colors.Accent = "#0f766e"
		nextStyle.Typography.FontFamily = "Arial, sans-serif"
		nextStyle.Layout.SectionSpacing = 11
	}
	if strings.Contains(prompt, "优化") || strings.Contains(prompt, "匹配") || strings.Contains(lower, "jd") {
		next.Summary = fmt.Sprintf("面向%s岗位，具备结果导向的项目推进、结构化表达和持续优化能力。", fallback(next.TargetRole, "目标"))
		enhanceBullets(&next)
	}
	next.HTML = renderFreeHTML(next, prompt)

	summary := "已生成演示修改计划。填写 API Key 后会调用真实模型。"
	return next, nextStyle, summary
}

func normalizeResume(value ResumeData) ResumeData {
	if value.ID == "" {
		value.ID = "resume-local"
	}
	if value.Title == "" {
		value.Title = "我的简历"
	}
	if value.Basics.Name == "" {
		value.Basics.Name = "你的姓名"
	}
	if strings.TrimSpace(value.HTML) == "" {
		value.HTML = renderFreeHTML(value, "")
	}
	if value.Sections == nil {
		value.Sections = []ResumeSection{}
	}
	ensureSection := func(id, typ, title string) {
		for _, section := range value.Sections {
			if section.ID == id {
				return
			}
		}
		value.Sections = append(value.Sections, ResumeSection{ID: id, Type: typ, Title: title, Items: []ResumeItem{}})
	}
	ensureSection("education", "education", "教育经历")
	ensureSection("experience", "experience", "工作经历")
	ensureSection("projects", "projects", "项目经历")
	ensureSection("skills", "skills", "技能")
	return value
}

func normalizeStyle(value ResumeStyle) ResumeStyle {
	if value.TemplateID == "" {
		value.TemplateID = "classic-a4"
	}
	if value.Page.Size == "" {
		value.Page.Size = "A4"
	}
	if value.Page.MarginMm == 0 {
		value.Page.MarginMm = 16
	}
	if value.Typography.FontFamily == "" {
		value.Typography.FontFamily = "Arial, sans-serif"
	}
	if value.Typography.BaseFontSize == 0 {
		value.Typography.BaseFontSize = 10.5
	}
	if value.Typography.HeadingFontSize == 0 {
		value.Typography.HeadingFontSize = 14
	}
	if value.Typography.LineHeight == 0 {
		value.Typography.LineHeight = 1.45
	}
	if value.Layout.Columns == 0 {
		value.Layout.Columns = 1
	}
	if value.Layout.SectionSpacing == 0 {
		value.Layout.SectionSpacing = 12
	}
	if value.Layout.ItemSpacing == 0 {
		value.Layout.ItemSpacing = 8
	}
	if value.Colors.Text == "" {
		value.Colors.Text = "#1f2937"
	}
	if value.Colors.Muted == "" {
		value.Colors.Muted = "#6b7280"
	}
	if value.Colors.Accent == "" {
		value.Colors.Accent = "#2563eb"
	}
	return value
}

func fillStarterResume(value ResumeData, prompt string) ResumeData {
	role := fallback(value.TargetRole, inferRole(prompt))
	value.TargetRole = role
	value.Summary = fmt.Sprintf("面向%s岗位，具备扎实的学习能力、项目执行能力和清晰沟通能力，能够快速理解业务目标并交付可衡量结果。", role)
	upsertSection(&value, "education", []ResumeItem{
		{
			ID:       "edu-demo",
			Title:    "学校名称 / 专业名称",
			Subtitle: "本科",
			Meta:     "2020 - 2024",
			Bullets:  []string{"主修课程与目标岗位相关，具备系统化基础知识。"},
		},
	})
	upsertSection(&value, "projects", []ResumeItem{
		{
			ID:       fmt.Sprintf("project-%d", time.Now().Unix()),
			Title:    "AI 简历编辑器",
			Subtitle: "个人项目",
			Meta:     "2026",
			Bullets: []string{
				"负责从需求拆解到界面实现的完整流程，完成聊天编辑、A4 预览和版本回滚核心闭环。",
				"设计结构化 resumeJson 与 styleJson 数据模型，提升内容修改、模板渲染和导出流程的稳定性。",
				"通过清晰的组件状态和错误反馈，降低用户在简历生成过程中的操作成本。",
			},
		},
	})
	upsertSection(&value, "skills", []ResumeItem{
		{
			ID:      "skills-demo",
			Title:   "核心技能",
			Bullets: []string{"结构化表达、项目推进、问题拆解、AI 工具使用、文档写作"},
		},
	})
	return value
}

func upsertSection(value *ResumeData, id string, items []ResumeItem) {
	for index := range value.Sections {
		if value.Sections[index].ID == id {
			value.Sections[index].Items = items
			return
		}
	}
	value.Sections = append(value.Sections, ResumeSection{ID: id, Type: id, Title: id, Items: items})
}

func enhanceBullets(value *ResumeData) {
	for sectionIndex := range value.Sections {
		for itemIndex := range value.Sections[sectionIndex].Items {
			item := &value.Sections[sectionIndex].Items[itemIndex]
			if len(item.Bullets) == 0 {
				item.Bullets = []string{"围绕目标岗位要求梳理关键成果，突出行动、方法和结果。"}
				continue
			}
			for bulletIndex := range item.Bullets {
				if !strings.Contains(item.Bullets[bulletIndex], "结果") {
					item.Bullets[bulletIndex] = item.Bullets[bulletIndex] + "，突出目标、动作和结果。"
				}
			}
		}
	}
}

func inferRole(prompt string) string {
	if strings.Contains(prompt, "前端") {
		return "前端开发工程师"
	}
	if strings.Contains(prompt, "后端") {
		return "后端开发工程师"
	}
	if strings.Contains(prompt, "产品") {
		return "产品经理"
	}
	if strings.Contains(prompt, "运营") {
		return "运营专员"
	}
	return "目标岗位"
}

func isEmptyResume(value ResumeData) bool {
	if value.Summary != "" {
		return false
	}
	for _, section := range value.Sections {
		if len(section.Items) > 0 {
			return false
		}
	}
	return true
}

func fallback(value, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return value
}

func renderFreeHTML(value ResumeData, prompt string) string {
	name := html.EscapeString(fallback(value.Basics.Name, "你的姓名"))
	role := html.EscapeString(fallback(value.TargetRole, "核心候选人"))
	summary := html.EscapeString(fallback(value.Summary, "具备清晰问题拆解、快速学习和跨团队协作能力，能够围绕目标交付稳定结果。"))
	accent := "#0f766e"
	if strings.Contains(prompt, "创意") || strings.Contains(prompt, "设计") {
		accent = "#7c3aed"
	}
	if strings.Contains(prompt, "金融") || strings.Contains(prompt, "咨询") {
		accent = "#1f2937"
	}

	projectTitle := "代表项目"
	projectBullets := []string{"围绕业务目标拆解任务，完成从方案到交付的闭环。", "沉淀结构化方法，提升协作效率和结果稳定性。"}
	for _, section := range value.Sections {
		if len(section.Items) == 0 {
			continue
		}
		item := section.Items[0]
		projectTitle = fallback(item.Title, projectTitle)
		if len(item.Bullets) > 0 {
			projectBullets = item.Bullets
		}
		break
	}

	bulletHTML := ""
	for _, bullet := range projectBullets {
		bulletHTML += fmt.Sprintf("<li>%s</li>", html.EscapeString(bullet))
	}

	return fmt.Sprintf(`<style>
  .free-resume {
    display: grid;
    grid-template-columns: 72mm 1fr;
    gap: 12mm;
    color: #111827;
    font-family: Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
  }
  .free-resume * { box-sizing: border-box; }
  .free-resume aside {
    min-height: 255mm;
    background: %s;
    color: white;
    padding: 12mm 8mm;
  }
  .free-resume main {
    padding-top: 2mm;
  }
  .free-resume h1 {
    margin: 0;
    font-size: 25pt;
    line-height: 1.05;
  }
  .free-resume .role {
    margin-top: 6px;
    font-size: 12pt;
    font-weight: 700;
  }
  .free-resume .contact {
    display: grid;
    gap: 5px;
    margin-top: 18px;
    font-size: 9pt;
    opacity: 0.92;
  }
  .free-resume section {
    margin-top: 14px;
  }
  .free-resume h2 {
    margin: 0 0 8px;
    color: %s;
    font-size: 13pt;
  }
  .free-resume aside h2 {
    color: white;
  }
  .free-resume .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .free-resume .tag-list span {
    border: 1px solid rgba(255,255,255,0.38);
    border-radius: 999px;
    padding: 3px 7px;
  }
  .free-resume .summary-card {
    border-left: 4px solid %s;
    background: #f8fafc;
    padding: 10px 12px;
  }
  .free-resume article {
    margin-top: 10px;
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
    margin: 6px 0 0 18px;
    padding: 0;
  }
</style>
<div class="free-resume">
  <aside>
    <h1>%s</h1>
    <div class="role">%s</div>
    <div class="contact">
      <span>%s</span>
      <span>%s</span>
      <span>%s</span>
    </div>
    <section>
      <h2>技能标签</h2>
      <div class="tag-list">
        <span>结构化表达</span>
        <span>项目推进</span>
        <span>AI 工具</span>
        <span>文档写作</span>
      </div>
    </section>
  </aside>
  <main>
    <section>
      <h2>职业摘要</h2>
      <p class="summary-card">%s</p>
    </section>
    <section>
      <h2>高相关经历</h2>
      <article>
        <div class="row">
          <strong>%s</strong>
          <span class="muted">2026</span>
        </div>
        <ul>%s</ul>
      </article>
    </section>
    <section>
      <h2>补充亮点</h2>
      <p>这是一份自由 HTML 简历，AI 可以继续改成双栏、时间线、作品集、咨询风格或任何适合岗位的结构。</p>
    </section>
  </main>
</div>`,
		accent,
		accent,
		accent,
		name,
		role,
		html.EscapeString(value.Basics.Phone),
		html.EscapeString(value.Basics.Email),
		html.EscapeString(value.Basics.Location),
		summary,
		html.EscapeString(projectTitle),
		bulletHTML,
	)
}
