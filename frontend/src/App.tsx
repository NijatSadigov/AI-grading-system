import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClassroomsPage from './pages/ClassroomsPage'
import ClassroomDetailPage from './pages/ClassroomDetailPage'
import StudentDetailPage from './pages/StudentDetailPage'
import TemplatePage from './pages/TemplatePage'
import TeachersPage from './pages/TeachersPage'
import AIReviewPage from './pages/AIReviewPage'
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/classrooms" element={<ClassroomsPage />} />
              <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
              <Route path="/students/:id" element={<StudentDetailPage />} />
              <Route path="/students/:id" element={<StudentDetailPage />} />
              <Route path="/students/:id/review" element={<AIReviewPage />} />
              <Route path="/template" element={<TemplatePage />} />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <TeachersPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}