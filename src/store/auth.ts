// store/auth.ts
import { create } from 'zustand'

export type Role = 'ADMIN' | 'ENSEIGNANT'
export type EtatSurveillant = 'SURVEILLANT' | 'NON_SURVEILLANT' | 'PAS_SURVEILLANT'

interface AuthState {
  token: string | null
  username: string | null
  role: Role | null
  userId: number | null
  etatSurveillant: EtatSurveillant | null
  isAuthenticated: boolean
  isAuthReady: boolean

  hydrate: () => void
  login: (data: {
    token: string
    username: string
    role: Role
    userId: number
    etatSurveillant: EtatSurveillant
  }) => void
  logout: () => void
  setTokenInStorageAndHeader: (token: string) => void
}

const TOKEN_KEY = 'auth_token'  // ← Consistent key everywhere

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  userId: null,
  etatSurveillant: null,
  isAuthenticated: false,
  isAuthReady: false,

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const username = localStorage.getItem('auth_username')
    const role = localStorage.getItem('auth_role') as Role | null
    const userId = localStorage.getItem('auth_userId')
    const etat = localStorage.getItem('auth_etatSurveillant') as EtatSurveillant | null

    set({
      token,
      username,
      role,
      userId: userId ? Number(userId) : null,
      etatSurveillant: etat,
      isAuthenticated: !!token,
      isAuthReady: true,
    })
  },

  login: (data) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem('auth_username', data.username)
    localStorage.setItem('auth_role', data.role)
    localStorage.setItem('auth_userId', String(data.userId))
    localStorage.setItem('auth_etatSurveillant', data.etatSurveillant)

    set({
      ...data,
      isAuthenticated: true,
      isAuthReady: true,
    })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_role')
    localStorage.removeItem('auth_userId')
    localStorage.removeItem('auth_etatSurveillant')

    set({
      token: null,
      username: null,
      role: null,
      userId: null,
      etatSurveillant: null,
      isAuthenticated: false,
      isAuthReady: true,
    })
  },

  setTokenInStorageAndHeader: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    // Assuming your axios instance uses interceptors or default headers
    // If not, configure it globally somewhere
  },
}))