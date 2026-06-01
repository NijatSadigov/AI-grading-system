package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"

	"nizamiM/internal/config"
	"nizamiM/internal/database"
	"nizamiM/internal/models"
)

// the four default descriptions used in the original Excel
const (
	descScore2 = "Zəif inkişaf edib"
	descScore3 = "Qismən inkişaf edib"
	descScore4 = "Stabil inkişaf edib"
	descScore5 = "Yüksək səviyyədə inkişaf edib"
)

// the 5 categories and their factors from the Excel
var templateData = []struct {
	Category string
	Factors  []string
}{
	{"Özünüdərk", []string{"Nizam-intizam", "Sevgi", "Vicdan", "Məsuliyyət", "Milli qürur", "Azadlıq", "Hədəf", "Millilik"}},
	{"Sağlam", []string{"Güvən - Özgüvən", "Sayğı", "Sadiqlik", "Mübarizə", "Təbiət", "Cəsarət", "Tənqid", "Dürüstlük"}},
	{"Yaradıcılıq", []string{"Araşdırma", "Empatiya", "Liderlik", "Səbir", "Həmrəylik", "Qəhrəmanlıq", "Sülh", "Ümid"}},
	{"Bacarıq", []string{"Çalışqanlıq", "Paylaşma", "Qayğı", "Komanda işi", "Uğur", "Yardımsevərlik", "Dostluq", "Qərarlılıq"}},
	{"Bilik", []string{"Tolerantlıq", "Çözüm", "Sahibkarlıq", "Qənaət", "Ana dili", "Ədalət", "Vətənpərvərlik", "Öyrənməyi öyrənmək"}},
}

func main() {
	_ = godotenv.Load()
	config.Load()
	database.Connect()

	// safety: refuse to run if there's already any category
	var count int64
	database.DB.Model(&models.Category{}).Count(&count)
	if count > 0 {
		log.Fatalf("template already has %d categories — refusing to seed twice", count)
	}

	for catIdx, cat := range templateData {
		category := models.Category{
			Name:         cat.Category,
			DisplayOrder: catIdx,
		}
		if err := database.DB.Create(&category).Error; err != nil {
			log.Fatalf("failed to create category %s: %v", cat.Category, err)
		}

		for fIdx, factorName := range cat.Factors {
			factor := models.EvaluationFactor{
				CategoryID:   category.ID,
				Name:         factorName,
				Description2: descScore2,
				Description3: descScore3,
				Description4: descScore4,
				Description5: descScore5,
				DisplayOrder: fIdx,
			}
			if err := database.DB.Create(&factor).Error; err != nil {
				log.Fatalf("failed to create factor %s: %v", factorName, err)
			}
		}
		fmt.Printf("✓ %s (%d factors)\n", cat.Category, len(cat.Factors))
	}

	fmt.Println("template seeded successfully")
}
