package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	FullName     string    `gorm:"not null" json:"full_name"`
	Role         string    `gorm:"not null;check:role IN ('admin','teacher')" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Category struct {
	ID           uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string             `gorm:"not null" json:"name"`
	DisplayOrder int                `gorm:"default:0" json:"display_order"`
	DeletedAt    gorm.DeletedAt     `gorm:"index" json:"-"`
	Factors      []EvaluationFactor `gorm:"foreignKey:CategoryID" json:"factors,omitempty"`
}

type EvaluationFactor struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CategoryID   uuid.UUID      `gorm:"type:uuid;not null" json:"category_id"`
	Name         string         `gorm:"not null" json:"name"`
	Description2 string         `gorm:"type:text" json:"description_2"`
	Description3 string         `gorm:"type:text" json:"description_3"`
	Description4 string         `gorm:"type:text" json:"description_4"`
	Description5 string         `gorm:"type:text" json:"description_5"`
	DisplayOrder int            `gorm:"default:0" json:"display_order"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type Classroom struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	TeacherID uuid.UUID `gorm:"type:uuid;not null" json:"teacher_id"`
	Teacher   *User     `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	Students  []Student `gorm:"foreignKey:ClassroomID" json:"students,omitempty"`
}

type Student struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ClassroomID uuid.UUID `gorm:"type:uuid;not null" json:"classroom_id"`
	FullName    string    `gorm:"not null" json:"full_name"`
	ParentEmail string    `json:"parent_email,omitempty"`
	Notes       string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	Grades      []Grade   `gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE" json:"grades,omitempty"`
}

type Grade struct {
	ID                       uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID                uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uniq_student_factor" json:"student_id"`
	FactorID                 uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:uniq_student_factor" json:"factor_id"`
	Score                    int16     `gorm:"not null;check:score BETWEEN 2 AND 5" json:"score"`
	FactorNameSnapshot       string    `gorm:"not null" json:"factor_name"`
	CategoryNameSnapshot     string    `gorm:"not null" json:"category_name"`
	ScoreDescriptionSnapshot string    `gorm:"type:text" json:"score_description"`
	GradedBy                 uuid.UUID `gorm:"type:uuid;not null" json:"graded_by"`
	GradedAt                 time.Time `json:"graded_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}
type AIReview struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StudentID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"student_id"`
	Content     string     `gorm:"type:text;not null" json:"content"`
	GradesHash  string     `gorm:"not null" json:"-"`
	ModelUsed   string     `json:"model_used"`
	GeneratedAt time.Time  `json:"generated_at"`
	GeneratedBy *uuid.UUID `gorm:"type:uuid" json:"generated_by,omitempty"`
}
