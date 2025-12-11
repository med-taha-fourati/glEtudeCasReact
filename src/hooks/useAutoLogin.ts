// hooks/useAutoLogin.ts
import { useEffect } from 'react'
import { enseignantApi } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'

export function useAutoLogin() {
  const { hydrate, login, logout, isAuthReady } = useAuthStore()

  useEffect(() => {
    const autoLogin = async () => {
      // First hydrate from storage (fast)
      hydrate()

      // If no token in storage → done
      const token = localStorage.getItem('auth_token')
      if (!token) {
        useAuthStore.setState({ isAuthReady: true })
        return
      }

      try {
        // Validate token with your actual endpoint
        const profileResponse = await enseignantApi.profile(token)
        const profile = profileResponse.data

        // Token is valid → update store with full user data
        login({
          token,
          username: profile.username,
          role: profile.role,
          userId: profile.id,
          etatSurveillant: profile.etatSurveillant === 'SURVEILLANT' 
            ? 'SURVEILLANT' 
            : profile.etatSurveillant === 'PAS_SURVEILLANT'
              ? 'NON_SURVEILLANT'
              : 'NON_SURVEILLANT',
        })
      } catch (err) {
        console.warn('Auto-login failed: invalid token')
        logout() // clear invalid token
      }
    }

    autoLogin()
  }, [])
}