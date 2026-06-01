package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"nizamiM/internal/auth"
	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "email and password required"})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// same error for "user not found" and "wrong password" — don't leak which
		return c.Status(401).JSON(fiber.Map{"error": "invalid credentials"})
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return c.Status(401).JSON(fiber.Map{"error": "invalid credentials"})
	}

	token, err := auth.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not generate token"})
	}

	return c.JSON(LoginResponse{Token: token, User: user})
}

func Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "user not found"})
	}
	return c.JSON(user)
}

// /Register Admin
type CreateTeacherRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
}

func CreateTeacher(c *fiber.Ctx) error {
	var req CreateTeacherRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.FullName == "" || len(req.Password) < 8 {
		return c.Status(400).JSON(fiber.Map{
			"error": "email, full_name, and password (min 8 chars) required",
		})
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not hash password"})
	}

	teacher := models.User{
		Email:        req.Email,
		PasswordHash: hash,
		FullName:     req.FullName,
		Role:         "teacher",
	}

	if err := database.DB.Create(&teacher).Error; err != nil {
		// most likely cause: duplicate email
		return c.Status(409).JSON(fiber.Map{"error": "could not create teacher (email may already exist)"})
	}

	return c.Status(201).JSON(teacher)
}

// GET /teachers — admin only
func ListTeachers(c *fiber.Ctx) error {
	var teachers []models.User
	if err := database.DB.
		Where("role = ?", "teacher").
		Order("created_at DESC").
		Find(&teachers).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch teachers"})
	}
	return c.JSON(teachers)
}

// POST /teachers/:id/reset-password — admin only
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func ResetTeacherPassword(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil || len(req.NewPassword) < 8 {
		return c.Status(400).JSON(fiber.Map{"error": "new_password (min 8 chars) required"})
	}

	var teacher models.User
	if err := database.DB.Where("id = ? AND role = 'teacher'", id).First(&teacher).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "teacher not found"})
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not hash password"})
	}
	teacher.PasswordHash = hash
	if err := database.DB.Save(&teacher).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not save"})
	}

	return c.JSON(fiber.Map{"reset": true})
}

// DELETE /teachers/:id — admin only
// Refuses if the teacher owns any classrooms (must reassign or delete those first)
func DeleteTeacher(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var teacher models.User
	if err := database.DB.Where("id = ? AND role = 'teacher'", id).First(&teacher).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "teacher not found"})
	}

	// safety: don't delete a teacher who still has classrooms
	var classroomCount int64
	database.DB.Model(&models.Classroom{}).Where("teacher_id = ?", id).Count(&classroomCount)
	if classroomCount > 0 {
		return c.Status(409).JSON(fiber.Map{
			"error":           "teacher has classrooms; reassign or delete them first",
			"classroom_count": classroomCount,
		})
	}

	if err := database.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}
