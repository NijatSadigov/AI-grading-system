package main

import (
	"flag"
	"fmt"
	"log"
	"strings"

	"github.com/joho/godotenv"

	"nizamiM/internal/auth"
	"nizamiM/internal/config"
	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

func main() {
	email := flag.String("email", "", "admin email")
	name := flag.String("name", "", "admin full name")
	password := flag.String("password", "", "admin password")
	flag.Parse()
	log.Printf("parsed: email=%q name=%q password=%q", *email, *name, *password)
	if *email == "" {
		log.Fatal("missing -email")
	}
	if *name == "" {
		log.Fatal("missing -name")
	}
	if *password == "" {
		log.Fatal("missing -password")
	}

	_ = godotenv.Load()
	config.Load()
	database.Connect()

	hash, err := auth.HashPassword(*password)
	if err != nil {
		log.Fatalf("hash failed: %v", err)
	}

	admin := models.User{
		Email:        strings.ToLower(*email),
		PasswordHash: hash,
		FullName:     *name,
		Role:         "admin",
	}

	if err := database.DB.Create(&admin).Error; err != nil {
		log.Fatalf("could not create admin: %v", err)
	}

	fmt.Printf("admin created: %s (%s)\n", admin.Email, admin.ID)

}
