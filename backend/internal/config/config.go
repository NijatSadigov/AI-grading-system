package config

import (
	"log"
	"os"
)

type Config struct {
	JWTSecret      string
	JWTExpireHours int
	Environment    string
}

var Cfg Config

func Load() {
	Cfg = Config{
		JWTSecret:   mustEnv("JWT_SECRET"),
		Environment: getEnv("ENVIRONMENT", "development"),
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env: %s", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
