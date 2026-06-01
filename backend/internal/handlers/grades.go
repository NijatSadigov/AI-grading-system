package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

// GET /students/:id/grades
func GetStudentGrades(c *fiber.Ctx) error {
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

	var grades []models.Grade
	if err := database.DB.Where("student_id = ?", studentID).
		Order("category_name_snapshot, factor_name_snapshot").
		Find(&grades).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch grades"})
	}
	return c.JSON(grades)
}

// PUT /students/:id/grades
type GradeInput struct {
	FactorID uuid.UUID `json:"factor_id"`
	Score    int16     `json:"score"`
}

func UpsertStudentGrades(c *fiber.Ctx) error {
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

	var inputs []GradeInput
	if err := c.BodyParser(&inputs); err != nil || len(inputs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "expected non-empty array of {factor_id, score}"})
	}

	// validate scores
	for i, g := range inputs {
		if g.Score < 2 || g.Score > 5 {
			return c.Status(400).JSON(fiber.Map{
				"error": "score must be 2-5",
				"index": i,
			})
		}
	}

	userID, _ := currentUser(c)
	now := time.Now()

	// fetch all referenced factors (including soft-deleted, so old grades can be updated)
	factorIDs := make([]uuid.UUID, 0, len(inputs))
	for _, g := range inputs {
		factorIDs = append(factorIDs, g.FactorID)
	}
	var factors []models.EvaluationFactor
	if err := database.DB.Unscoped().
		Where("id IN ?", factorIDs).
		Find(&factors).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not load factors"})
	}

	// batch-fetch all categories these factors belong to
	categoryIDSet := make(map[uuid.UUID]struct{})
	for _, f := range factors {
		categoryIDSet[f.CategoryID] = struct{}{}
	}
	categoryIDs := make([]uuid.UUID, 0, len(categoryIDSet))
	for cid := range categoryIDSet {
		categoryIDs = append(categoryIDs, cid)
	}

	var categories []models.Category
	if err := database.DB.Unscoped().
		Where("id IN ?", categoryIDs).
		Find(&categories).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not load categories"})
	}
	categoryByID := make(map[uuid.UUID]models.Category, len(categories))
	for _, cat := range categories {
		categoryByID[cat.ID] = cat
	}

	// build a lookup so we can resolve names + score descriptions
	type factorWithCat struct {
		factor   models.EvaluationFactor
		category models.Category
	}
	lookup := make(map[uuid.UUID]factorWithCat, len(factors))
	for _, f := range factors {
		lookup[f.ID] = factorWithCat{factor: f, category: categoryByID[f.CategoryID]}
	}

	// upsert in a transaction
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		for _, g := range inputs {
			fc := lookup[g.FactorID]
			desc := pickDescription(&fc.factor, g.Score)

			var existing models.Grade
			err := tx.Where("student_id = ? AND factor_id = ?", studentID, g.FactorID).
				First(&existing).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// create
				grade := models.Grade{
					StudentID:                studentID,
					FactorID:                 g.FactorID,
					Score:                    g.Score,
					FactorNameSnapshot:       fc.factor.Name,
					CategoryNameSnapshot:     fc.category.Name,
					ScoreDescriptionSnapshot: desc,
					GradedBy:                 userID,
					GradedAt:                 now,
					UpdatedAt:                now,
				}
				if err := tx.Create(&grade).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				// update — refresh snapshots in case names/descriptions changed
				existing.Score = g.Score
				existing.FactorNameSnapshot = fc.factor.Name
				existing.CategoryNameSnapshot = fc.category.Name
				existing.ScoreDescriptionSnapshot = desc
				existing.GradedBy = userID
				existing.UpdatedAt = now
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not save grades"})
	}

	// return the updated full set
	var grades []models.Grade
	database.DB.Where("student_id = ?", studentID).
		Order("category_name_snapshot, factor_name_snapshot").
		Find(&grades)
	return c.JSON(grades)
}

// DELETE /students/:id/grades/:factor_id
func DeleteGrade(c *fiber.Ctx) error {
	studentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid student id"})
	}
	factorID, err := uuid.Parse(c.Params("factor_id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid factor id"})
	}

	var student models.Student
	if err := database.DB.First(&student, "id = ?", studentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "student not found"})
	}
	if _, err := loadClassroomWithAccess(c, student.ClassroomID); err != nil {
		return err
	}

	res := database.DB.Where("student_id = ? AND factor_id = ?", studentID, factorID).
		Delete(&models.Grade{})
	if res.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete grade"})
	}
	return c.JSON(fiber.Map{"deleted": res.RowsAffected > 0})
}

// GET /classrooms/:id/grades-summary
// classroom-level overview: all students × all factors with current grades
func GetClassroomGradesSummary(c *fiber.Ctx) error {
	classroomID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid classroom id"})
	}
	if _, err := loadClassroomWithAccess(c, classroomID); err != nil {
		return err
	}

	var students []models.Student
	if err := database.DB.Where("classroom_id = ?", classroomID).
		Order("full_name ASC").
		Find(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch students"})
	}

	studentIDs := make([]uuid.UUID, len(students))
	for i, s := range students {
		studentIDs[i] = s.ID
	}

	var grades []models.Grade
	if len(studentIDs) > 0 {
		database.DB.Where("student_id IN ?", studentIDs).Find(&grades)
	}

	// shape: { student_id -> { factor_id -> grade } }
	gradeMap := make(map[uuid.UUID]map[uuid.UUID]models.Grade)
	for _, g := range grades {
		if gradeMap[g.StudentID] == nil {
			gradeMap[g.StudentID] = make(map[uuid.UUID]models.Grade)
		}
		gradeMap[g.StudentID][g.FactorID] = g
	}

	type studentSummary struct {
		Student models.Student             `json:"student"`
		Grades  map[uuid.UUID]models.Grade `json:"grades"` // keyed by factor_id
		Total   int                        `json:"total"`
		ZoneRu  string                     `json:"zone"` // Kritik / Risk / Stabil / Yüksək
	}

	summaries := make([]studentSummary, 0, len(students))
	for _, s := range students {
		gs := gradeMap[s.ID]
		if gs == nil {
			gs = map[uuid.UUID]models.Grade{}
		}
		total := 0
		for _, g := range gs {
			total += int(g.Score)
		}
		summaries = append(summaries, studentSummary{
			Student: s,
			Grades:  gs,
			Total:   total,
			ZoneRu:  classifyZone(total),
		})
	}
	// count total active factors so the frontend can compute completion
	var totalFactors int64
	database.DB.Model(&models.EvaluationFactor{}).Count(&totalFactors)

	return c.JSON(fiber.Map{
		"classroom_id":  classroomID,
		"summaries":     summaries,
		"total_factors": totalFactors,
	})

}

// classifyZone reproduces the bucketing from the original Excel
func classifyZone(total int) string {
	switch {
	case total >= 85:
		return "Yüksək inkişaf"
	case total >= 70:
		return "Stabil inkişaf"
	case total >= 50:
		return "Risk zonası"
	default:
		return "Kritik zona"
	}
}

// pickDescription returns the description for a given score from a factor
func pickDescription(f *models.EvaluationFactor, score int16) string {
	switch score {
	case 2:
		return f.Description2
	case 3:
		return f.Description3
	case 4:
		return f.Description4
	case 5:
		return f.Description5
	}
	return ""
}
