import { api } from './client'
import type { Grade, Student } from '../types/models'

export interface StudentSummary {
  student: Student
  grades: Record<string, Grade> // keyed by factor_id
  total: number
  zone: string
}

export interface ClassroomGradesSummary {
  classroom_id: string
  summaries: StudentSummary[]
  total_factors: number
}

export interface GradeInput {
  factor_id: string
  score: number
}

export const gradesApi = {
  classroomSummary: (classroomId: string) =>
    api
      .get<ClassroomGradesSummary>(`/classrooms/${classroomId}/grades-summary`)
      .then((r) => r.data),

  studentGrades: (studentId: string) =>
    api.get<Grade[]>(`/students/${studentId}/grades`).then((r) => r.data),

  upsertStudentGrades: (studentId: string, grades: GradeInput[]) =>
    api.put<Grade[]>(`/students/${studentId}/grades`, grades).then((r) => r.data),
}