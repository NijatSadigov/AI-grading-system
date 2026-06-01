package ai

import (
	"fmt"
	"sort"
	"strings"

	"nizamiM/internal/models"
)

const SystemPrompt = `You are writing a school report for a parent in Azerbaijan. The student is graded on a 5-principle analytical framework: 5 categories × 8 factors = 40 factors total, each factor scored 2 to 5.

Your job: synthesize the grades into a warm, honest, conversational review in Azerbaijani.

REQUIREMENTS:
- Language: Azerbaijani (Azərbaycan dili). Use proper diacritics.
- Tone: formal "Siz" form addressing the parent, but conversational and supportive — not clinical or cold. Avoid heavy jargon.
- Be honest about weak areas, framed constructively. Do not sugarcoat — parents deserve accurate information.
- Be specific. Reference actual category names where the student excelled or struggled.
- Refer to the child as "övladınız" or by their first name, not "şagird".

OUTPUT FORMAT:
Return ONLY valid JSON, no markdown fences, no extra text before or after. Match this schema exactly:

{
  "overall_picture": "string — 2-3 sentence synthesis, the headline impression",
  "strengths": [
    { "area": "string — category name", "description": "string — 2-3 sentences" }
  ],
  "growth_areas": [
    { "area": "string — category name", "description": "string — 2-3 sentences, constructive framing" }
  ],
  "recommendations": {
    "books": [
      { "title": "string", "author": "string", "reason": "string — 1-2 sentences why this fits this student" }
    ],
    "films": [
      { "title": "string", "reason": "string — 1-2 sentences why this fits" }
    ],
    "activities": [
      { "title": "string", "description": "string — 2-3 sentences, practical and simple" }
    ]
  }
}

RECOMMENDATIONS RULES:
- 2-3 books: PREFER well-known Azerbaijani literature (Anar, Mirzə Cəlil, Səməd Vurğun, Nizami Gəncəvi, Bəxtiyar Vahabzadə, etc.) and globally recognized classics (Le Petit Prince, Charlie and the Chocolate Factory, To Kill a Mockingbird, etc.). Self-help / personal development books are welcome if widely known.
- 1-2 films/shows: age-appropriate, well-known, animated or family-friendly.
- 1-2 family activities: practical, low-cost, doable at home or in the city.

CRITICAL: Do NOT invent book titles, authors, or films. If you are not certain a specific work exists and fits, omit it rather than guess. Better to recommend fewer items than to hallucinate.

STRENGTHS / GROWTH AREAS RULES:
- Strengths: 1-3 entries, drawn from categories where the student averages 4-5.
- Growth areas: 1-3 entries, drawn from categories where the student averages 2-3.
- If there are no clear growth areas (everything is 4+), say so positively, suggesting how to maintain momentum.
- If everything is low, do not hide it — emphasize potential and concrete next steps.
- Focus on what's most meaningful, not exhaustive coverage.`

// BuildUserPrompt assembles the per-student grade data for the LLM.
func BuildUserPrompt(student models.Student, classroom models.Classroom, grades []models.Grade) string {
	type catGroup struct {
		grades []models.Grade
	}
	groups := make(map[string]*catGroup)
	for _, g := range grades {
		gp, ok := groups[g.CategoryNameSnapshot]
		if !ok {
			gp = &catGroup{}
			groups[g.CategoryNameSnapshot] = gp
		}
		gp.grades = append(gp.grades, g)
	}

	categoryNames := make([]string, 0, len(groups))
	for name := range groups {
		categoryNames = append(categoryNames, name)
	}
	sort.Strings(categoryNames)

	var b strings.Builder
	fmt.Fprintf(&b, "STUDENT: %s\n", student.FullName)
	fmt.Fprintf(&b, "CLASSROOM: %s\n", classroom.Name)
	if strings.TrimSpace(student.Notes) != "" {
		fmt.Fprintf(&b, "TEACHER NOTES: %s\n", student.Notes)
	}
	b.WriteString("\nGRADES (score / 5, with description):\n")

	total, count := 0, 0
	for _, catName := range categoryNames {
		gp := groups[catName]
		fmt.Fprintf(&b, "\n[%s]\n", strings.ToUpper(catName))
		sort.Slice(gp.grades, func(i, j int) bool {
			return gp.grades[i].FactorNameSnapshot < gp.grades[j].FactorNameSnapshot
		})
		for _, g := range gp.grades {
			desc := g.ScoreDescriptionSnapshot
			if desc == "" {
				desc = "—"
			}
			fmt.Fprintf(&b, "- %s: %d/5 (%s)\n", g.FactorNameSnapshot, g.Score, desc)
			total += int(g.Score)
			count++
		}
	}

	fmt.Fprintf(&b, "\nTOTAL: %d out of %d possible\n\n", total, count*5)
	b.WriteString("Generate the parent-facing review now. Return JSON only, no other text.")
	return b.String()
}
