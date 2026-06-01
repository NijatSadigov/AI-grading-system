package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/ai"
	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

func computeGradesHash(grades []models.Grade) string {
	type kv struct {
		fid   string
		score int16
	}
	pairs := make([]kv, 0, len(grades))
	for _, g := range grades {
		pairs = append(pairs, kv{fid: g.FactorID.String(), score: g.Score})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].fid < pairs[j].fid })
	h := sha256.New()
	for _, p := range pairs {
		fmt.Fprintf(h, "%s=%d;", p.fid, p.score)
	}
	return hex.EncodeToString(h.Sum(nil))
}

// GET /students/:id/ai-review — fetch latest cached
func GetAIReview(c *fiber.Ctx) error {
	studentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid student id"})
	}

	var student models.Student
	if err := database.DB.First(&student, "id = ?", studentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "student not found"})
	}
	if _, err := loadClassroomWithAccess(c, student.ClassroomID); err != nil {
		return err
	}

	var review models.AIReview
	err = database.DB.
		Where("student_id = ?", studentID).
		Order("generated_at DESC").
		First(&review).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "no review yet"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "database error"})
	}

	// also report whether grades changed since this review
	var grades []models.Grade
	database.DB.Where("student_id = ?", studentID).Find(&grades)
	currentHash := computeGradesHash(grades)

	return c.JSON(fiber.Map{
		"review":   review,
		"is_stale": review.GradesHash != currentHash,
	})
}

// POST /students/:id/ai-review?force=true — generate with caching
func GenerateAIReview(c *fiber.Ctx) error {
	studentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid student id"})
	}
	force := c.Query("force") == "true"

	var student models.Student
	if err := database.DB.First(&student, "id = ?", studentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "student not found"})
	}
	classroom, err := loadClassroomWithAccess(c, student.ClassroomID)
	if err != nil {
		return err
	}

	var grades []models.Grade
	if err := database.DB.Where("student_id = ?", studentID).Find(&grades).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not load grades"})
	}
	if len(grades) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Şagird üçün hələ qiymət yoxdur"})
	}

	hash := computeGradesHash(grades)

	// cache hit?
	if !force {
		var cached models.AIReview
		if err := database.DB.
			Where("student_id = ? AND grades_hash = ?", studentID, hash).
			Order("generated_at DESC").
			First(&cached).Error; err == nil {
			return c.JSON(fiber.Map{"review": cached, "is_stale": false, "from_cache": true})
		}
	}

	// generate
	userPrompt := ai.BuildUserPrompt(student, *classroom, grades)
	client := ai.NewClient()
	raw, err := client.Complete(ai.SystemPrompt, userPrompt)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": "AI generation failed: " + err.Error()})
	}

	// strip code fences if Claude added them
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	// validate JSON shape
	var validation map[string]any
	if err := json.Unmarshal([]byte(cleaned), &validation); err != nil {
		return c.Status(502).JSON(fiber.Map{
			"error": "AI returned invalid JSON",
			"raw":   raw,
		})
	}

	userID, _ := currentUser(c)
	review := models.AIReview{
		StudentID:   studentID,
		Content:     cleaned,
		GradesHash:  hash,
		ModelUsed:   client.Model(),
		GeneratedBy: &userID,
	}
	if err := database.DB.Create(&review).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not save review"})
	}

	return c.JSON(fiber.Map{"review": review, "is_stale": false, "from_cache": false})
}
