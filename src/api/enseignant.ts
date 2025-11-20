import api from './api'

export type LoginPayload = {
  username: string
  password: string
}

export type LoginResponse = {
  token: string
  username: string
  role: 'ADMIN' | 'ENSEIGNANT'
}

export const enseignantApi = {
  login: (payload: LoginPayload) => api.post<LoginResponse>('/enseignant/login', payload),
  register: (payload: Record<string, unknown>) => api.post('/enseignant/register', payload),
  profile: () => api.get('/enseignant/profile'),
  fetchAll: () => api.get('/enseignant/fetch'),
  edit: (payload: Record<string, unknown>) => api.put('/enseignant/edit', payload),
  delete: (id: number) => api.delete(`/enseignant/delete?id=${id}`),
  recalcCharges: () => api.post('/enseignant/recalculer-charges')
}
