package handlers

import (
	"fmt"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/excel"
	"nizamiM/internal/models"
)

// GET /students/:id/export
func ExportStudentXLSX(c *fiber.Ctx) error {
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

	categories, err := fetchTemplate()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch template"})
	}

	var grades []models.Grade
	database.DB.Where("student_id = ?", studentID).Find(&grades)

	buf, err := excel.BuildStudentWorkbook(student, categories, grades)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not generate excel"})
	}

	filename := fmt.Sprintf("%s.xlsx", student.FullName)
	setDownloadHeaders(c, filename)
	return c.Send(buf.Bytes())
}

// GET /classrooms/:id/export
func ExportClassroomXLSX(c *fiber.Ctx) error {
	classroomID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid classroom id"})
	}
	classroom, err := loadClassroomWithAccess(c, classroomID)
	if err != nil {
		return err
	}

	var students []models.Student
	database.DB.Where("classroom_id = ?", classroomID).Order("full_name ASC").Find(&students)

	categories, err := fetchTemplate()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch template"})
	}

	gradesByStudent := map[string][]models.Grade{}
	if len(students) > 0 {
		ids := make([]uuid.UUID, len(students))
		for i, s := range students {
			ids[i] = s.ID
		}
		var grades []models.Grade
		database.DB.Where("student_id IN ?", ids).Find(&grades)
		for _, g := range grades {
			gradesByStudent[g.StudentID.String()] = append(gradesByStudent[g.StudentID.String()], g)
		}
	}

	buf, err := excel.BuildClassroomWorkbook(*classroom, students, categories, gradesByStudent)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not generate excel"})
	}

	filename := fmt.Sprintf("%s - sinif hesabatı.xlsx", classroom.Name)
	setDownloadHeaders(c, filename)
	return c.Send(buf.Bytes())
}

// helpers

func fetchTemplate() ([]models.Category, error) {
	var categories []models.Category
	err := database.DB.
		Preload("Factors", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Order("display_order ASC").
		Find(&categories).Error
	return categories, err
}

func setDownloadHeaders(c *fiber.Ctx, filename string) {
	// RFC 5987: ASCII fallback + URL-encoded UTF-8 version for non-ASCII names
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(
		`attachment; filename="export.xlsx"; filename*=UTF-8''%s`,
		url.PathEscape(filename),
	))
}
