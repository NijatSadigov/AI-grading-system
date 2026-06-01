package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

// currentUser pulls user_id and role from c.Locals (set by RequireAuth)
func currentUser(c *fiber.Ctx) (uuid.UUID, string) {
	id, _ := c.Locals("user_id").(uuid.UUID)
	role, _ := c.Locals("role").(string)
	return id, role
}

// loadClassroomWithAccess fetches a classroom and confirms the caller can touch it.
// Returns the classroom, or a fiber error to return directly.
func loadClassroomWithAccess(c *fiber.Ctx, classroomID uuid.UUID) (*models.Classroom, error) {
	userID, role := currentUser(c)

	var classroom models.Classroom
	err := database.DB.First(&classroom, "id = ?", classroomID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fiber.NewError(404, "classroom not found")
	}
	if err != nil {
		return nil, fiber.NewError(500, "database error")
	}

	if role != "admin" && classroom.TeacherID != userID {
		return nil, fiber.NewError(403, "forbidden")
	}
	return &classroom, nil
}
