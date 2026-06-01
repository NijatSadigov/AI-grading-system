package excel

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"nizamiM/internal/models"
)

// BuildStudentWorkbook produces a one-sheet workbook for a single student.
func BuildStudentWorkbook(student models.Student, categories []models.Category, grades []models.Grade) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := sanitizeSheetName(student.FullName)
	idx, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}
	f.SetActiveSheet(idx)
	_ = f.DeleteSheet("Sheet1")

	writeStudentSheet(f, sheetName, student, categories, grades)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return &buf, nil
}

// writeStudentSheet fills one sheet with the 5 Prinsip layout. Used by both single and classroom exports.
func writeStudentSheet(f *excelize.File, sheet string, student models.Student, categories []models.Category, grades []models.Grade) {
	// row 1: student name banner
	f.SetCellValue(sheet, "A1", fmt.Sprintf("Şagird: %s", student.FullName))
	f.MergeCell(sheet, "A1", "H1")

	// row 2: headers
	headers := []string{"Prinsip", "№", "Meyar", "2 bal", "3 bal", "4 bal", "5 bal", "Verilən bal"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, h)
	}

	// build grade lookup
	gradeByFactor := make(map[uuid.UUID]models.Grade, len(grades))
	for _, g := range grades {
		gradeByFactor[g.FactorID] = g
	}

	// data rows
	row := 3
	firstScoreRow := row
	for _, cat := range categories {
		for i, factor := range cat.Factors {
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), cat.Name)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), i+1)
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), factor.Name)
			f.SetCellValue(sheet, fmt.Sprintf("D%d", row), factor.Description2)
			f.SetCellValue(sheet, fmt.Sprintf("E%d", row), factor.Description3)
			f.SetCellValue(sheet, fmt.Sprintf("F%d", row), factor.Description4)
			f.SetCellValue(sheet, fmt.Sprintf("G%d", row), factor.Description5)
			if g, ok := gradeByFactor[factor.ID]; ok {
				f.SetCellValue(sheet, fmt.Sprintf("H%d", row), g.Score)
			}
			row++
		}
	}
	lastScoreRow := row - 1

	// total + zone formulas
	totalRow := row + 1
	zoneRow := totalRow + 1
	f.SetCellValue(sheet, fmt.Sprintf("F%d", totalRow), "Ümumi bal")
	f.SetCellFormula(sheet, fmt.Sprintf("G%d", totalRow), fmt.Sprintf("SUM(H%d:H%d)", firstScoreRow, lastScoreRow))
	f.SetCellValue(sheet, fmt.Sprintf("F%d", zoneRow), "Kateqoriya")
	f.SetCellFormula(sheet, fmt.Sprintf("G%d", zoneRow),
		fmt.Sprintf(`IF(G%d>=85,"Yüksək inkişaf",IF(G%d>=70,"Stabil inkişaf",IF(G%d>=50,"Risk zonası","Kritik zona")))`,
			totalRow, totalRow, totalRow))

	applyStyles(f, sheet, firstScoreRow, lastScoreRow, totalRow, zoneRow)
}

func applyStyles(f *excelize.File, sheet string, firstScoreRow, lastScoreRow, totalRow, zoneRow int) {
	border := []excelize.Border{
		{Type: "left", Color: "000000", Style: 1},
		{Type: "right", Color: "000000", Style: 1},
		{Type: "top", Color: "000000", Style: 1},
		{Type: "bottom", Color: "000000", Style: 1},
	}

	bannerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14, Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheet, "A1", "H1", bannerStyle)
	f.SetRowHeight(sheet, 1, 28)

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Family: "Calibri"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#D9E1F2"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	f.SetCellStyle(sheet, "A2", "H2", headerStyle)

	bodyStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Calibri"},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
		Border:    border,
	})
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", firstScoreRow), fmt.Sprintf("H%d", lastScoreRow), bodyStyle)

	totalStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    border,
	})
	f.SetCellStyle(sheet, fmt.Sprintf("F%d", totalRow), fmt.Sprintf("G%d", zoneRow), totalStyle)

	f.SetColWidth(sheet, "A", "A", 14)
	f.SetColWidth(sheet, "B", "B", 5)
	f.SetColWidth(sheet, "C", "C", 22)
	f.SetColWidth(sheet, "D", "G", 22)
	f.SetColWidth(sheet, "H", "H", 12)
}

// Excel limits sheet names to 31 chars and forbids certain characters.
func sanitizeSheetName(name string) string {
	for _, c := range []string{":", "\\", "/", "?", "*", "[", "]"} {
		name = strings.ReplaceAll(name, c, "")
	}
	if len(name) > 31 {
		name = name[:31]
	}
	if strings.TrimSpace(name) == "" {
		name = "Şagird"
	}
	return name
}
