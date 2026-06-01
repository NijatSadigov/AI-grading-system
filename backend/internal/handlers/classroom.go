package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

type ClassroomRequest struct {
	Name      string     `json:"name"`
	TeacherID *uuid.UUID `json:"teacher_id,omitempty"` // admin only; ignored if teacher creates
}

// GET /classrooms — teachers see own; admin sees all
func ListClassrooms(c *fiber.Ctx) error {
	userID, role := currentUser(c)

	q := database.DB.Preload("Teacher").Order("created_at DESC")
	if role != "admin" {
		q = q.Where("teacher_id = ?", userID)
	}

	var classrooms []models.Classroom
	if err := q.Find(&classrooms).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch classrooms"})
	}
	return c.JSON(classrooms)
}

// GET /classrooms/:id
func GetClassroom(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	classroom, err := loadClassroomWithAccess(c, id)
	if err != nil {
		return err
	}

	database.DB.Preload("Teacher").First(classroom, "id = ?", id)

	database.DB.Where("classroom_id = ?", id).
		Order("full_name ASC").
		Find(&classroom.Students)

	return c.JSON(classroom)
}

// POST /classrooms
func CreateClassroom(c *fiber.Ctx) error {
	var req ClassroomRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name required"})
	}

	userID, role := currentUser(c)

	// teacher_id defaults to caller; admin can override
	teacherID := userID
	if role == "admin" && req.TeacherID != nil {
		teacherID = *req.TeacherID
		// sanity check: teacher exists and is actually a teacher
		var u models.User
		if err := database.DB.First(&u, "id = ? AND role = 'teacher'", teacherID).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "teacher_id invalid"})
		}
	}

	classroom := models.Classroom{Name: req.Name, TeacherID: teacherID}
	if err := database.DB.Create(&classroom).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create classroom"})
	}
	return c.Status(201).JSON(classroom)
}

// PATCH /classrooms/:id
func UpdateClassroom(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	classroom, err := loadClassroomWithAccess(c, id)
	if err != nil {
		return err
	}

	var req ClassroomRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Name != "" {
		classroom.Name = req.Name
	}

	// admin can reassign to another teacher
	_, role := currentUser(c)
	if role == "admin" && req.TeacherID != nil {
		classroom.TeacherID = *req.TeacherID
	}

	if err := database.DB.Save(classroom).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not update"})
	}
	return c.JSON(classroom)
}

// DELETE /classrooms/:id — cascades to students + grades
func DeleteClassroom(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	if _, err := loadClassroomWithAccess(c, id); err != nil {
		return err
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		// collect student IDs in this classroom
		var studentIDs []uuid.UUID
		if err := tx.Model(&models.Student{}).
			Where("classroom_id = ?", id).
			Pluck("id", &studentIDs).Error; err != nil {
			return err
		}

		// delete grades for those students
		if len(studentIDs) > 0 {
			if err := tx.Where("student_id IN ?", studentIDs).
				Delete(&models.Grade{}).Error; err != nil {
				return err
			}
		}

		// delete the students
		if err := tx.Where("classroom_id = ?", id).
			Delete(&models.Student{}).Error; err != nil {
			return err
		}

		// finally delete the classroom
		return tx.Delete(&models.Classroom{}, "id = ?", id).Error
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}
