package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

// ============ Categories ============

type CategoryRequest struct {
	Name         string `json:"name"`
	DisplayOrder int    `json:"display_order"`
}

// GET /template — full tree (categories + their factors), admin & teachers
func GetTemplate(c *fiber.Ctx) error {
	var categories []models.Category
	err := database.DB.
		Preload("Factors", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Order("display_order ASC").
		Find(&categories).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not fetch template"})
	}
	return c.JSON(categories)
}

func CreateCategory(c *fiber.Ctx) error {
	var req CategoryRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name required"})
	}
	cat := models.Category{Name: req.Name, DisplayOrder: req.DisplayOrder}
	if err := database.DB.Create(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create category"})
	}
	return c.Status(201).JSON(cat)
}

func UpdateCategory(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	var req CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	var cat models.Category
	if err := database.DB.First(&cat, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "category not found"})
	}
	cat.Name = req.Name
	cat.DisplayOrder = req.DisplayOrder
	if err := database.DB.Save(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not update"})
	}
	return c.JSON(cat)
}

// DELETE /categories/:id?wipe_grades=true|false
// soft-deletes the category and all its factors; optionally wipes the grades too
func DeleteCategory(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	wipe := c.Query("wipe_grades") == "true"

	// transaction: soft-delete category + its factors, optionally hard-delete grades
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		// collect factor IDs first (for grade wipe)
		var factorIDs []uuid.UUID
		if err := tx.Model(&models.EvaluationFactor{}).
			Where("category_id = ?", id).
			Pluck("id", &factorIDs).Error; err != nil {
			return err
		}

		if wipe && len(factorIDs) > 0 {
			if err := tx.Where("factor_id IN ?", factorIDs).
				Delete(&models.Grade{}).Error; err != nil {
				return err
			}
		}

		// soft-delete factors then the category
		if err := tx.Where("category_id = ?", id).
			Delete(&models.EvaluationFactor{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&models.Category{}, "id = ?", id).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete"})
	}
	return c.JSON(fiber.Map{"deleted": true, "wiped_grades": wipe})
}

// ============ Factors ============

type FactorRequest struct {
	CategoryID   uuid.UUID `json:"category_id"`
	Name         string    `json:"name"`
	Description2 string    `json:"description_2"`
	Description3 string    `json:"description_3"`
	Description4 string    `json:"description_4"`
	Description5 string    `json:"description_5"`
	DisplayOrder int       `json:"display_order"`
}

func CreateFactor(c *fiber.Ctx) error {
	var req FactorRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" || req.CategoryID == uuid.Nil {
		return c.Status(400).JSON(fiber.Map{"error": "category_id and name required"})
	}

	// verify category exists
	var cat models.Category
	if err := database.DB.First(&cat, "id = ?", req.CategoryID).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "category not found"})
	}

	f := models.EvaluationFactor{
		CategoryID:   req.CategoryID,
		Name:         req.Name,
		Description2: req.Description2,
		Description3: req.Description3,
		Description4: req.Description4,
		Description5: req.Description5,
		DisplayOrder: req.DisplayOrder,
	}
	if err := database.DB.Create(&f).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not create factor"})
	}
	return c.Status(201).JSON(f)
}

func UpdateFactor(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	var req FactorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	var f models.EvaluationFactor
	if err := database.DB.First(&f, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "factor not found"})
	}

	f.Name = req.Name
	f.Description2 = req.Description2
	f.Description3 = req.Description3
	f.Description4 = req.Description4
	f.Description5 = req.Description5
	f.DisplayOrder = req.DisplayOrder
	// note: we don't allow changing CategoryID on update — feels rare & messy

	if err := database.DB.Save(&f).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not update"})
	}
	return c.JSON(f)
}

// DELETE /factors/:id?wipe_grades=true|false
func DeleteFactor(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	wipe := c.Query("wipe_grades") == "true"

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if wipe {
			if err := tx.Where("factor_id = ?", id).Delete(&models.Grade{}).Error; err != nil {
				return err
			}
		}
		return tx.Delete(&models.EvaluationFactor{}, "id = ?", id).Error
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "could not delete"})
	}
	return c.JSON(fiber.Map{"deleted": true, "wiped_grades": wipe})
}
