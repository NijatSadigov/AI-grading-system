package excel

import (
	"bytes"
	"fmt"

	"github.com/xuri/excelize/v2"

	"nizamiM/internal/models"
)

// BuildClassroomWorkbook produces a workbook with one sheet per student.
func BuildClassroomWorkbook(classroom models.Classroom, students []models.Student, categories []models.Category, gradesByStudent map[string][]models.Grade) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	defer f.Close()

	if len(students) == 0 {
		// empty placeholder so the file is valid
		f.SetCellValue("Sheet1", "A1", fmt.Sprintf("Sinif: %s (şagird yoxdur)", classroom.Name))
		var buf bytes.Buffer
		if err := f.Write(&buf); err != nil {
			return nil, err
		}
		return &buf, nil
	}

	usedNames := map[string]int{}
	for i, s := range students {
		name := sanitizeSheetName(s.FullName)
		// dedupe sheet names if two students happen to share one after truncation
		if n := usedNames[name]; n > 0 {
			name = sanitizeSheetName(fmt.Sprintf("%s (%d)", name, n+1))
		}
		usedNames[name]++

		if i == 0 {
			f.SetSheetName("Sheet1", name)
		} else {
			if _, err := f.NewSheet(name); err != nil {
				return nil, err
			}
		}
		writeStudentSheet(f, name, s, categories, gradesByStudent[s.ID.String()])
	}

	f.SetActiveSheet(0)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return &buf, nil
}
