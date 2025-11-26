import api from './api'

// Full entity type (returned from backend)
export type Matiere = {
  id: number
  nom: string
  nbPaquets: number
  seance?: {
    id: number
    seanceDate: string
    verrouillee: boolean
  }
}

// DTO type (for creation/editing)
export type MatiereDTO = {
  nom: string
  nbPaquets: number
  seanceId: number
}

export const matiereApi = {
  fetchAll: () => api.get<Matiere[]>('/matiere/fetchAll'),
  add: (payload: MatiereDTO) => api.post<Matiere>('/matiere/add', payload),
  edit: (id: number, payload: MatiereDTO) => api.put<Matiere>(`/matiere/edit?id=${id}`, payload),
  delete: (id: number) => api.delete(`/matiere/delete?id=${id}`)
}
