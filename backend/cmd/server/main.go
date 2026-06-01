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

	database.Connect()
	config.Load()

	app := fiber.New(fiber.Config{
		AppName: "School Grading API",
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173", 
		AllowCredentials: true,
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// TODO: register routes here
	// routes.Register(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	handlers.Register(app)
	for _, routes := range app.Stack() {
		for _, route := range routes {
			log.Printf("%-6s %s", route.Method, route.Path)
		}
	}
	log.Fatal(app.Listen(":" + port))
}
