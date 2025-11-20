import api from './api'

export type Matiere = {
  id: number
  code: string
  libelle: string
  description?: string
  nbPaquets: number
  responsableId?: number
}

export const matiereApi = {
  fetchAll: () => api.get<Matiere[]>('/matiere/fetchAll'),
  search: (term: string) => api.get<Matiere[]>(`/matiere/search?term=${term}`),
  add: (payload: Partial<Matiere>) => api.post('/matiere/add', payload),
  edit: (payload: Partial<Matiere>) => api.put('/matiere/edit', payload),
  delete: (id: number) => api.delete(`/matiere/delete?id=${id}`)
}
