import { api } from './client'
import type { Category, EvaluationFactor } from '../types/models'

export interface CategoryInput {
  name: string
  display_order?: number
}

export interface FactorInput {
  category_id: string
  name: string
  description_2?: string
  description_3?: string
  description_4?: string
  description_5?: string
  display_order?: number
}

export const templateApi = {
  get: () => api.get<Category[]>('/template').then((r) => r.data),

  createCategory: (data: CategoryInput) =>
    api.post<Category>('/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: CategoryInput) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: string, wipeGrades: boolean) =>
    api
      .delete<{ deleted: boolean; wiped_grades: boolean }>(
        `/categories/${id}${wipeGrades ? '?wipe_grades=true' : ''}`,
      )
      .then((r) => r.data),

  createFactor: (data: FactorInput) =>
    api.post<EvaluationFactor>('/factors', data).then((r) => r.data),
  updateFactor: (id: string, data: Omit<FactorInput, 'category_id'>) =>
    api.patch<EvaluationFactor>(`/factors/${id}`, data).then((r) => r.data),
  deleteFactor: (id: string, wipeGrades: boolean) =>
    api
      .delete<{ deleted: boolean; wiped_grades: boolean }>(
        `/factors/${id}${wipeGrades ? '?wipe_grades=true' : ''}`,
      )
      .then((r) => r.data),
}