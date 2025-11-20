import { ReactNode, useEffect } from 'react'
import { useAuthStore, Role } from '@/store/auth'
import { useLocation, useNavigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, hydrate } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } })
    } else if (allowedRoles && role && !allowedRoles.includes(role)) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, role, allowedRoles, navigate, location])

  if (!isAuthenticated) return null

  return <>{children}</>
}
