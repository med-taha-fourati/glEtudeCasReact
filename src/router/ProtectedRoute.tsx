import { ReactNode, useEffect } from 'react'
import { useAuthStore, Role } from '@/store/auth'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, isAuthReady, hydrate } = useAuthStore()
  const location = useLocation()

  // Load data from localStorage once
  useEffect(() => {
    hydrate()
  }, [])

  // Still loading state → prevent redirect
  if (!isAuthReady) {
    return <div className="p-4 text-center">Loading...</div>
  }

  // Not authenticated → redirect AFTER hydration
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Role denied
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
