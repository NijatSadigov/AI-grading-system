export type Role = 'admin' | 'teacher'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface EvaluationFactor {
  id: string
  category_id: string
  name: string
  description_2: string
  description_3: string
  description_4: string
  description_5: string
  display_order: number
}

export interface Category {
  id: string
  name: string
  display_order: number
  factors?: EvaluationFactor[]
}

export interface Classroom {
  id: string
  name: string
  teacher_id: string
  teacher?: User

  created_at: string
  students?: Student[]
}

export interface Student {
  id: string
  classroom_id: string
  full_name: string
  parent_email?: string
  notes?: string
  created_at: string
}

export interface Grade {
  id: string
  student_id: string
  factor_id: string
  score: number
  factor_name: string
  category_name: string
  score_description: string
  graded_by: string
  graded_at: string
  updated_at: string
}