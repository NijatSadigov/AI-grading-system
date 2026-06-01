package handlers

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

type StudentRequest struct {
	FullName    string `json:"full_name"`
	ParentEmail string `json:"parent_email"`
	Notes       string `json:"notes"`
}

// GET /classrooms/:id/students
func ListStudents(c *fiber.Ctx) error {
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
	return c.JSON(students)
}

// GET /students/:id
func GetStudent(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var s models.Student
	if err := database.DB.First(&s, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "student not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "database error"})
	}
	if _, err := loadClassroomWithAccess(c, s.ClassroomID); err != nil {
		return err
	}
	return c.JSON(s)
}

// POST /classrooms/:id/students — single create
func CreateStudent(c *fiber.Ctx) error {
	classroomID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid classroom id"})
	}
	if _, err := loadClassroomWithAccess(c, classroomID); err != nil {
		return err
	}

	var req StudentRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.FullName) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "full_name required"})
	}

	s := models.Student{
		ClassroomID: classroomID,
		FullName:    strings.TrimSpace(req.FullName),
		ParentEmail: strings.TrimSpace(req.ParentEmail),
		Notes:       req.Notes,
	}
	if err := database.DB.Create(&s).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create student"})
	}
	return c.Status(201).JSON(s)
}

// POST /classrooms/:id/students/bulk — array of student objects
func BulkCreateStudents(c *fiber.Ctx) error {
	classroomID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid classroom id"})
	}
	if _, err := loadClassroomWithAccess(c, classroomID); err != nil {
		return err
	}

	var reqs []StudentRequest
	if err := c.BodyParser(&reqs); err != nil || len(reqs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "expected non-empty JSON array"})
	}

	students := make([]models.Student, 0, len(reqs))
	for i, r := range reqs {
		name := strings.TrimSpace(r.FullName)
		if name == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "all students must have full_name",
				"index": i,
			})
		}
		students = append(students, models.Student{
			ClassroomID: classroomID,
			FullName:    name,
			ParentEmail: strings.TrimSpace(r.ParentEmail),
			Notes:       r.Notes,
		})
	}

	if err := database.DB.Create(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create students"})
	}
	return c.Status(201).JSON(fiber.Map{
		"created":  len(students),
		"students": students,
	})
}

// POST /classrooms/:id/students/import-csv — multipart/form-data, field "file"
// Expected CSV: header row with columns full_name, parent_email, notes (last two optional)
func ImportStudentsCSV(c *fiber.Ctx) error {
	classroomID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid classroom id"})
	}
	if _, err := loadClassroomWithAccess(c, classroomID); err != nil {
		return err
	}

	fh, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "file field required (multipart/form-data)"})
	}
	f, err := fh.Open()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "could not open uploaded file"})
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "could not read file"})
	}
	// strip UTF-8 BOM if present (Excel adds it)
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})

	reader := csv.NewReader(bytes.NewReader(data))
	reader.FieldsPerRecord = -1 // allow variable column counts

	rows, err := reader.ReadAll()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid CSV: " + err.Error()})
	}
	if len(rows) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "CSV needs a header row + at least one student"})
	}

	// map header positions
	header := rows[0]
	colIdx := map[string]int{}
	for i, h := range header {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	nameCol, ok := colIdx["full_name"]
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "CSV must have a 'full_name' column"})
	}
	emailCol, hasEmail := colIdx["parent_email"]
	notesCol, hasNotes := colIdx["notes"]

	students := make([]models.Student, 0, len(rows)-1)
	for i, row := range rows[1:] {
		if nameCol >= len(row) {
			return c.Status(400).JSON(fiber.Map{
				"error": "row missing full_name",
				"row":   i + 2, // +2 because 1-indexed + header
			})
		}
		name := strings.TrimSpace(row[nameCol])
		if name == "" {
			continue // skip blank rows silently
		}
		s := models.Student{ClassroomID: classroomID, FullName: name}
		if hasEmail && emailCol < len(row) {
			s.ParentEmail = strings.TrimSpace(row[emailCol])
		}
		if hasNotes && notesCol < len(row) {
			s.Notes = strings.TrimSpace(row[notesCol])
		}
		students = append(students, s)
	}

	if len(students) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "no valid student rows found"})
	}

	if err := database.DB.Create(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create students"})
	}
	return c.Status(201).JSON(fiber.Map{
		"created":  len(students),
		"students": students,
	})
}

// PATCH /students/:id
func UpdateStudent(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var s models.Student
	if err := database.DB.First(&s, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "student not found"})
	}
	if _, err := loadClassroomWithAccess(c, s.ClassroomID); err != nil {
		return err
	}

	var req StudentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if name := strings.TrimSpace(req.FullName); name != "" {
		s.FullName = name
	}
	s.ParentEmail = strings.TrimSpace(req.ParentEmail)
	s.Notes = req.Notes

	if err := database.DB.Save(&s).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not update"})
	}
	return c.JSON(s)
}

// DELETE /students/:id — cascades to grades
func DeleteStudent(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var s models.Student
	if err := database.DB.First(&s, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "student not found"})
	}
	if _, err := loadClassroomWithAccess(c, s.ClassroomID); err != nil {
		return err
	}

	if err := database.DB.Delete(&models.Student{}, "id = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}
