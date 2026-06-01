import { api } from './client'
import type { Student } from '../types/models'

export interface StudentInput {
  full_name: string
  parent_email?: string
  notes?: string
}

export const studentsApi = {
  listByClassroom: (classroomId: string) =>
    api.get<Student[]>(`/classrooms/${classroomId}/students`).then((r) => r.data),

  get: (id: string) =>
    api.get<Student>(`/students/${id}`).then((r) => r.data),

  create: (classroomId: string, data: StudentInput) =>
    api.post<Student>(`/classrooms/${classroomId}/students`, data).then((r) => r.data),

  bulkCreate: (classroomId: string, students: StudentInput[]) =>
    api
      .post<{ created: number; students: Student[] }>(
        `/classrooms/${classroomId}/students/bulk`,
        students,
      )
      .then((r) => r.data),

  importCSV: (classroomId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<{ created: number; students: Student[] }>(
        `/classrooms/${classroomId}/students/import-csv`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      .then((r) => r.data)
  },

  update: (id: string, data: Partial<StudentInput>) =>
    api.patch<Student>(`/students/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/students/${id}`).then((r) => r.data),
}