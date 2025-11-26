import api from './api'

// Full entity type (returned from backend)
export type Seance = {
  id: number
  seanceDate: string
  verrouillee: boolean
  passeeExamen: boolean
  enseignants?: Array<{
    id: number
    nom: string
    prenom: string
    etatSurveillant: 'PAS_SURVEILLANT' | 'SURVEILLANT'
  }>
  matieres?: Array<{
    id: number
    nom: string
    nbPaquets: number
  }>
  horaire?: {
    embHoraire: {
      hDebut: number
      hFin: number
    }
  }
}

// DTO type (for creation/editing)
export type SeanceDTO = {
  jour: number
  mois: number
  annee: number
  horaireHDebut: number
  horaireHFin: number
}

export const seanceApi = {
  fetchAll: () => api.get<Seance[]>('/seance/fetchAll'),
  fetchDisponibles: () => api.get<Seance[]>('/seance/disponibles'),
  fetch: (id: number) => api.get<Seance>(`/seance/fetch?id=${id}`),
  add: (payload: SeanceDTO) => api.post<Seance>('/seance/add', payload),
  edit: (id: number, payload: SeanceDTO) => api.put<Seance>(`/seance/edit?id=${id}`, payload),
  delete: (id: number) => api.delete(`/seance/delete?id=${id}`),
  soumettreVoeu: (enseignantId: number, seanceId: number) => api.post(`/seance/soumettre-voeu?enseignantId=${enseignantId}&seanceId=${seanceId}`),
  verrouiller: (verrouiller: boolean) => api.post(`/seance/verrouiller?verrouiller=${verrouiller}`),
  affecterAutomatiquement: () => api.post('/seance/affecter-automatiquement'),
  terminerExamen: (id: number) => api.post(`/seance/terminer-examen?seanceId=${id}`)
}
