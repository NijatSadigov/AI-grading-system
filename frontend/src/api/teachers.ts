import { api } from './client'
import type { User } from '../types/models'

export interface CreateTeacherInput {
  email: string
  full_name: string
  password: string
}

export const teachersApi = {
  list: () => api.get<User[]>('/teachers').then((r) => r.data),

  create: (data: CreateTeacherInput) =>
    api.post<User>('/teachers', data).then((r) => r.data),

  resetPassword: (id: string, newPassword: string) =>
    api
      .post<{ reset: boolean }>(`/teachers/${id}/reset-password`, {
        new_password: newPassword,
      })
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ deleted: boolean }>(`/teachers/${id}`).then((r) => r.data),
}