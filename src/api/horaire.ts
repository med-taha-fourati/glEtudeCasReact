import api from './api'
import { Seance } from './enseignant'

// Full entity type (returned from backend)
export type Horaire = {
  embHoraire: {
    hDebut: number
    hFin: number
  }
  seances?: Array<Seance>
}

// DTO type (for creation/editing)
export type HoraireDTO = {
  hDebut: number
  hFin: number
}

export const horaireApi = {
  fetchAll: () => api.get<Horaire[]>('/horaire/'),
  get: (hDebut: number, hFin: number) => api.get<Horaire>(`/horaire/get?hDebut=${hDebut}&hFin=${hFin}`),
  add: (payload: HoraireDTO) => api.post<Horaire>('/horaire/add', payload),
  edit: (oldHDebut: number, oldHFin: number, payload: HoraireDTO) => api.put<Horaire>(`/horaire/edit?oldHDebut=${oldHDebut}&oldHFin=${oldHFin}`, payload),
  delete: (hDebut: number, hFin: number) => api.delete(`/horaire/delete?hDebut=${hDebut}&hFin=${hFin}`)
}
