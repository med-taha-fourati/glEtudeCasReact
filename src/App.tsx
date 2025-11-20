import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useUIStore } from '@/store/ui'

export function App() {
  const { globalError, clearGlobalError } = useUIStore()

  useEffect(() => {
    if (!globalError) return
    const timer = setTimeout(() => clearGlobalError(), 6000)
    return () => clearTimeout(timer)
  }, [globalError, clearGlobalError])

  return (
    <div className="min-h-screen">
      {globalError && (
        <div className="w-full bg-red-600 text-white text-center text-sm px-4 py-2">
          {globalError}
        </div>
      )}
      <AppRouter />
    </div>
  )
}
