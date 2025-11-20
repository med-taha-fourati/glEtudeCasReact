import api from './api'

export type Voeu = {
  id: number
  enseignantId: number
  seanceId: number
  matiere: string
  date: string
  etat: 'APPROUVE' | 'EN_ATTENTE' | 'REFUSE'
}

export type SubmitVoeuPayload = {
  seanceId: number
}

export const voeuApi = {
  fetchMine: () => api.get<Voeu[]>('/voeu/mine'),
  submit: (payload: SubmitVoeuPayload) => api.post('/voeu/submit', payload)
}
