import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { normalizeError, AppError } from '@/utils/errorHandling'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }
  return config
})

// Global error normalization interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize error to AppError format
    const normalizedError: AppError = normalizeError(error)

    // Log for debugging
    console.error('[API Error]', normalizedError)

    // Handle special authentication case
    if (normalizedError.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    // Set global error message for UI store (optional)
    // const uiStore = useUIStore.getState()
    // if (normalizedError.status && normalizedError.status >= 500) {
    //   uiStore.setGlobalError(normalizedError.message)
    // }

    // CRITICAL: Reject with normalized error, not raw error
    return Promise.reject(normalizedError)
  }
)

export default api
