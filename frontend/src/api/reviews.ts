import { api } from './client'

export interface ReviewBook {
  title: string
  author: string
  reason: string
}

export interface ReviewFilm {
  title: string
  reason: string
}

export interface ReviewActivity {
  title: string
  description: string
}

export interface ReviewItem {
  area: string
  description: string
}

export interface ReviewContent {
  overall_picture: string
  strengths: ReviewItem[]
  growth_areas: ReviewItem[]
  recommendations: {
    books: ReviewBook[]
    films: ReviewFilm[]
    activities: ReviewActivity[]
  }
}

export interface AIReview {
  id: string
  student_id: string
  content: string // JSON string of ReviewContent
  model_used: string
  generated_at: string
  generated_by?: string
}

export interface ReviewResponse {
  review: AIReview
  is_stale: boolean
  from_cache?: boolean
}

export const reviewsApi = {
  get: (studentId: string) =>
    api.get<ReviewResponse>(`/students/${studentId}/ai-review`).then((r) => r.data),

  generate: (studentId: string, force = false) =>
    api
      .post<ReviewResponse>(
        `/students/${studentId}/ai-review${force ? '?force=true' : ''}`,
      )
      .then((r) => r.data),
}