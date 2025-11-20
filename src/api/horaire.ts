import api from './api'

export type Horaire = {
  id: number
  libelle: string
  dateDebut: string
  dateFin: string
}

export const horaireApi = {
  fetchAll: () => api.get<Horaire[]>('/horaire/get'),
  add: (payload: Partial<Horaire>) => api.post('/horaire/add', payload),
  edit: (payload: Partial<Horaire>) => api.put('/horaire/edit', payload),
  delete: (id: number) => api.delete(`/horaire/delete?id=${id}`)
}
