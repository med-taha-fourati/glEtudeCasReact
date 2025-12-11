// App.tsx
import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'

export function App() {
  const { globalError, clearGlobalError } = useUIStore()
  const { hydrate, isAuthReady } = useAuthStore()

  // Hydrate once on app start
  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (globalError) {
      const t = setTimeout(clearGlobalError, 6000)
      return () => clearTimeout(t)
    }
  }, [globalError])

  // Optional: show loader until auth is ready
  if (!isAuthReady) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen">
      {globalError && (
        <div className="w-full bg-red-600 text-white text-center px-4 py-2">
          {globalError}
        </div>
      )}
      <AppRouter />
    </div>
  )
}