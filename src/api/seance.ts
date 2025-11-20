import api from './api'

export type Seance = {
  id: number
  dateDebut: string
  dateFin: string
  salle?: string
  nbPaquetsTotal: number
  currentSurveillants: number
  surveillants?: string[]
  isLocked: boolean
}

export const seanceApi = {
  fetchAll: () => api.get<Seance[]>('/seance/fetchAll'),
  fetchDisponibles: () => api.get<Seance[]>('/seance/disponibles'),
  fetchMine: () => api.get<Seance[]>('/seance/mine'),
  lock: (id: number) => api.post(`/seance/verrouiller?id=${id}`),
  unlock: (id: number) => api.post(`/seance/affecter-automatiquement?id=${id}`),
  add: (payload: Record<string, unknown>) => api.post('/seance/add', payload),
  edit: (payload: Record<string, unknown>) => api.put('/seance/edit', payload),
  delete: (id: number) => api.delete(`/seance/delete?id=${id}`),
  affecterAutomatiquement: () => api.post('/seance/affecter-automatiquement'),
  terminerExamen: (id: number) => api.post(`/seance/terminer-examen?id=${id}`),
  soumettreVoeu: (payload: { seanceId: number }) => api.post('/seance/soumettre-voeu', payload)
}
