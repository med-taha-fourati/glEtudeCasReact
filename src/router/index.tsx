import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardHome } from '@/pages/dashboard/DashboardHome'
import { ProtectedRoute } from './ProtectedRoute'
import { SeanceListPage } from '@/pages/seances/SeanceListPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { MatieresPage } from '@/pages/matieres/MatieresPage'
import { GradesPage } from '@/pages/grades/GradesPage'
import { HorairesPage } from '@/pages/horaires/HorairesPage'
import { EnseignantList } from '@/pages/enseignants/EnseignantList'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHome />} />

        <Route
          path="enseignants"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <EnseignantList />
            </ProtectedRoute>
          }
        />
        <Route
          path="matieres"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MatieresPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="grades"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <GradesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="horaires"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <HorairesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="seances"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SeanceListPage />
            </ProtectedRoute>
          }
        />

        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
