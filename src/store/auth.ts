import { create } from 'zustand'

export type Role = 'ADMIN' | 'ENSEIGNANT'

type AuthState = {
  token: string | null
  username: string | null
  role: Role | null
  userId: number | null
  isAuthenticated: boolean
  login: (token: string, username: string, role: Role, userId: number) => void
  logout: () => void
  hydrate: () => void
}

const TOKEN_KEY = 'auth.token'
const USERNAME_KEY = 'auth.username'
const ROLE_KEY = 'auth.role'
const USER_ID_KEY = 'auth.userId'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  userId: null,
  isAuthenticated: false,
  login: (token, username, role, userId) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(ROLE_KEY, role)
    localStorage.setItem(USER_ID_KEY, String(userId))
    set({ token, username, role, userId, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(USER_ID_KEY)
    set({ token: null, username: null, role: null, userId: null, isAuthenticated: false })
  },
  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const username = localStorage.getItem(USERNAME_KEY)
    const role = localStorage.getItem(ROLE_KEY) as Role | null
    const userId = localStorage.getItem(USER_ID_KEY)
    set({
      token,
      username,
      role,
      userId: userId ? parseInt(userId) : null,
      isAuthenticated: !!token
    })
  }
}))
