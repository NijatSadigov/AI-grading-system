package database

import (
	"fmt"
	"log"
	"nizamiM/internal/models"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var dsn string

	if url := os.Getenv("DATABASE_URL"); url != "" {
		// hosting platforms typically give a single URL
		dsn = url
	} else {
		// local dev / individual vars
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PORT"),
		)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	db.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

	if err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.EvaluationFactor{},
		&models.Classroom{},
		&models.Student{},
		&models.Grade{},
		&models.AIReview{},
	); err != nil {
		log.Fatalf("auto-migrate failed: %v", err)
	}

	DB = db
	log.Println("database connected & migrated")
}
