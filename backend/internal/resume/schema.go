package resume

type ResumeData struct {
	ID         string          `json:"id"`
	Title      string          `json:"title"`
	HTML       string          `json:"html"`
	TargetRole string          `json:"targetRole"`
	Basics     ResumeBasics    `json:"basics"`
	Summary    string          `json:"summary"`
	Sections   []ResumeSection `json:"sections"`
}

type ResumeBasics struct {
	Name     string   `json:"name"`
	Phone    string   `json:"phone"`
	Email    string   `json:"email"`
	Location string   `json:"location"`
	Links    []string `json:"links"`
}

type ResumeSection struct {
	ID    string       `json:"id"`
	Type  string       `json:"type"`
	Title string       `json:"title"`
	Items []ResumeItem `json:"items"`
}

type ResumeItem struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Subtitle string   `json:"subtitle,omitempty"`
	Meta     string   `json:"meta,omitempty"`
	Bullets  []string `json:"bullets,omitempty"`
}

type ResumeStyle struct {
	TemplateID string          `json:"templateId"`
	Page       PageStyle       `json:"page"`
	Typography TypographyStyle `json:"typography"`
	Layout     LayoutStyle     `json:"layout"`
	Colors     ColorStyle      `json:"colors"`
}

type PageStyle struct {
	Size     string  `json:"size"`
	MarginMm float64 `json:"marginMm"`
}

type TypographyStyle struct {
	FontFamily      string  `json:"fontFamily"`
	BaseFontSize    float64 `json:"baseFontSize"`
	HeadingFontSize float64 `json:"headingFontSize"`
	LineHeight      float64 `json:"lineHeight"`
}

type LayoutStyle struct {
	Columns        int     `json:"columns"`
	SectionSpacing float64 `json:"sectionSpacing"`
	ItemSpacing    float64 `json:"itemSpacing"`
}

type ColorStyle struct {
	Text   string `json:"text"`
	Muted  string `json:"muted"`
	Accent string `json:"accent"`
}
