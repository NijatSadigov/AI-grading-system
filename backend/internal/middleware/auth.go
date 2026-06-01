package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"nizamiM/internal/auth"
)

// RequireAuth validates the JWT and stuffs user_id + role into c.Locals
func RequireAuth(c *fiber.Ctx) error {
	header := c.Get("Authorization")
	if header == "" || !strings.HasPrefix(header, "Bearer ") {
		return c.Status(401).JSON(fiber.Map{"error": "missing or malformed token"})
	}

	tokenStr := strings.TrimPrefix(header, "Bearer ")
	claims, err := auth.ParseToken(tokenStr)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	c.Locals("user_id", claims.UserID)
	c.Locals("role", claims.Role)
	return c.Next()
}

// RequireRole checks the user's role matches one of the allowed roles
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "unauthenticated"})
		}
		for _, allowed := range roles {
			if role == allowed {
				return c.Next()
			}
		}
		return c.Status(403).JSON(fiber.Map{"error": "forbidden"})
	}
}
