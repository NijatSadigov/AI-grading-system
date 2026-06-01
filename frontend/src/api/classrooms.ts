import { api } from './client'
import type { Classroom, Student } from '../types/models'

export const classroomsApi = {
  list: () =>
    api.get<Classroom[]>('/classrooms').then((r) => r.data),

  get: (id: string) =>
    api.get<Classroom & { students?: Student[] }>(`/classrooms/${id}`).then((r) => r.data),

  create: (data: { name: string; teacher_id?: string }) =>
    api.post<Classroom>('/classrooms', data).then((r) => r.data),

  update: (id: string, data: { name?: string; teacher_id?: string }) =>
    api.patch<Classroom>(`/classrooms/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/classrooms/${id}`).then((r) => r.data),
}