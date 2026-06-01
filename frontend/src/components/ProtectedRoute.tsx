import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'
import type { Role } from '../types/models'

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode
  roles?: Role[]
}) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role))
    return <div className="p-8 text-red-600">Forbidden</div>
  return <>{children}</>
}