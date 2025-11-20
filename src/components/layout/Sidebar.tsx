import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/components/ui/utils'

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
    isActive ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800/60'
  )

export function Sidebar() {
  const { role } = useAuthStore()

  return (
    <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-100">
      <div className="px-4 py-4 text-lg font-semibold border-b border-slate-800">
        SE Dashboard
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        <NavLink to="/dashboard" className={linkClasses}>
          Dashboard
        </NavLink>

        {role === 'ADMIN' && (
          <>
            <NavLink to="/enseignants" className={linkClasses}>
              Enseignants
            </NavLink>
            <NavLink to="/matieres" className={linkClasses}>
              Matières
            </NavLink>
            <NavLink to="/grades" className={linkClasses}>
              Grades
            </NavLink>
            <NavLink to="/horaires" className={linkClasses}>
              Horaires
            </NavLink>
            <NavLink to="/seances" className={linkClasses}>
              Séances
            </NavLink>
            <NavLink to="/profile" className={linkClasses}>
              Profil
            </NavLink>
          </>
        )}

        {role === 'ENSEIGNANT' && (
          <>
            <NavLink to="/voeux" className={linkClasses}>
              Vœux
            </NavLink>
            <NavLink to="/profile" className={linkClasses}>
              Profil
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
