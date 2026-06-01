package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"nizamiM/internal/config"
	"nizamiM/internal/database"
	"nizamiM/internal/handlers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using OS env")
	}

	config.Load()
	database.Connect()

	app := fiber.New(fiber.Config{
		AppName: "School Grading API",
	})

	app.Use(logger.New())

	// CORS — read allowed origins from env. Defaults to local dev.
	// For Render set CORS_ORIGINS to your Vercel URL (e.g. https://hedef-grading.vercel.app)
	// Multiple origins can be comma-separated.
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://ai-grading-system-umber.vercel.app",
		AllowCredentials: corsOrigins != "*",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	handlers.Register(app)

	for _, routes := range app.Stack() {
		for _, route := range routes {
			log.Printf("%-6s %s", route.Method, route.Path)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen("0.0.0.0:" + port))
}
