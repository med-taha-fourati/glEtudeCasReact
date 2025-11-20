import { create } from 'zustand'

export type Role = 'ADMIN' | 'ENSEIGNANT'

type AuthState = {
  token: string | null
  username: string | null
  role: Role | null
  isAuthenticated: boolean
  login: (token: string, username: string, role: Role) => void
  logout: () => void
  hydrate: () => void
}

const TOKEN_KEY = 'auth.token'
const USERNAME_KEY = 'auth.username'
const ROLE_KEY = 'auth.role'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  isAuthenticated: false,
  login: (token, username, role) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(ROLE_KEY, role)
    set({ token, username, role, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(ROLE_KEY)
    set({ token: null, username: null, role: null, isAuthenticated: false })
  },
  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const username = localStorage.getItem(USERNAME_KEY)
    const role = localStorage.getItem(ROLE_KEY) as Role | null
    set({
      token,
      username,
      role,
      isAuthenticated: !!token
    })
  }
}))
