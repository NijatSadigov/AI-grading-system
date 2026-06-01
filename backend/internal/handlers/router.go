package handlers

import (
	"github.com/gofiber/fiber/v2"

	"nizamiM/internal/middleware"
)

func Register(app *fiber.App) {
	api := app.Group("/api/v1")

	// public
	api.Post("/auth/login", Login)

	// authenticated
	authed := api.Group("", middleware.RequireAuth)
	authed.Get("/auth/me", Me)
	authed.Get("/template", GetTemplate)

	// classrooms — teachers see own, admin sees all
	authed.Get("/classrooms", ListClassrooms)
	authed.Get("/classrooms/:id", GetClassroom)
	authed.Post("/classrooms", CreateClassroom)
	authed.Patch("/classrooms/:id", UpdateClassroom)
	authed.Delete("/classrooms/:id", DeleteClassroom)

	// students — ownership enforced via classroom
	authed.Get("/classrooms/:id/students", ListStudents)
	authed.Post("/classrooms/:id/students", CreateStudent)
	authed.Post("/classrooms/:id/students/bulk", BulkCreateStudents)
	authed.Post("/classrooms/:id/students/import-csv", ImportStudentsCSV)
	authed.Get("/students/:id", GetStudent)
	authed.Patch("/students/:id", UpdateStudent)
	authed.Delete("/students/:id", DeleteStudent)

	// grades
	authed.Get("/students/:id/grades", GetStudentGrades)
	authed.Put("/students/:id/grades", UpsertStudentGrades)
	authed.Delete("/students/:id/grades/:factor_id", DeleteGrade)
	authed.Get("/classrooms/:id/grades-summary", GetClassroomGradesSummary)

	// exports
	authed.Get("/students/:id/export", ExportStudentXLSX)
	authed.Get("/classrooms/:id/export", ExportClassroomXLSX)
	//AI review
	authed.Get("/students/:id/ai-review", GetAIReview)
	authed.Post("/students/:id/ai-review", GenerateAIReview)
	// admin only
	admin := authed.Group("", middleware.RequireRole("admin"))
	admin.Post("/teachers", CreateTeacher)

	admin.Post("/categories", CreateCategory)
	admin.Patch("/categories/:id", UpdateCategory)
	admin.Delete("/categories/:id", DeleteCategory)

	admin.Post("/factors", CreateFactor)
	admin.Patch("/factors/:id", UpdateFactor)
	admin.Delete("/factors/:id", DeleteFactor)
	admin.Get("/teachers", ListTeachers)
	admin.Post("/teachers", CreateTeacher) // already exists
	admin.Post("/teachers/:id/reset-password", ResetTeacherPassword)
	admin.Delete("/teachers/:id", DeleteTeacher)

}
