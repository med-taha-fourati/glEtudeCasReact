import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { username, role, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center justify-between bg-white border-b px-4 py-2">
      <div className="font-semibold text-slate-800">Gestion des surveillances</div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <div className="font-medium">{username ?? 'Utilisateur'}</div>
          <div className="text-slate-500">
            {role === 'ADMIN' ? 'Responsable SE' : 'Enseignant'}
          </div>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback>{username?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </div>
    </header>
  )
}
