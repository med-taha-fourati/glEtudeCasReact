import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const uiStore = useUIStore.getState()

    if (!error.response) {
      uiStore.setGlobalError('Réseau indisponible ou serveur injoignable.')
      return Promise.reject(error)
    }

    const status = error.response.status

    if (status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (status >= 500) {
      uiStore.setGlobalError('Erreur serveur interne.')
    }

    return Promise.reject(error)
  }
)

export default api
