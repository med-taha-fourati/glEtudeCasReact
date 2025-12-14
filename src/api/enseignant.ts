import api from './api'

export type IdOr<T> = number | T

export type LoginPayload = {
  username: string
  password: string
}

export type LoginResponse = {
  token: string
  issuedAt: number
}

export type Grade = {
  id: number
  grade: number
  chargeSurveillance: number
}

export type Matiere = {
  id: number
  nom: string
  nbPaquets: number
}

export type Seance = {
  id: number
  seanceDate: string
  verrouillee: boolean
  passeeExamen: boolean
  matieres?: IdOr<Matiere>[]
  horaire?: {
    embHoraire: {
      hDebut: number
      hFin: number
    }
  }
}

export type Enseignant = {
  id: number
  username: string
  nom: string
  prenom: string
  tel: number
  etatSurveillant: 'PAS_SURVEILLANT' | 'SURVEILLANT'
  role: 'ADMIN' | 'ENSEIGNANT'
  anciennete: number

  grade?: IdOr<Grade>
  matieres?: IdOr<Matiere>[]
  seances?: IdOr<Seance>[]
}

export type EnseignantDTO = {
  username: string
  password: string
  nom: string
  prenom: string
  tel: number
  gradeId: number
  matiere: number[]
  etatSurveillant: 'PAS_SURVEILLANT' | 'SURVEILLANT'
}

export type CalculerMResponse = {
  enseignantId: number
  m: number
  chargeSurveillance: number
}

export const enseignantApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/enseignant/login', payload),

  register: (payload: EnseignantDTO) =>
    api.post<Enseignant>('/enseignant/register', payload),

  profile: (token: string) =>
    api.post<Enseignant>('/enseignant/profile', { token }),

  fetchAll: () =>
    api.get<Enseignant[]>('/enseignant/fetch'),

  edit: (id: number, payload: EnseignantDTO) =>
    api.put<Enseignant>(`/enseignant/edit?id=${id}`, payload),

  delete: (id: number) =>
    api.delete(`/enseignant/delete?id=${id}`),

  recalcCharges: () =>
    api.post('/enseignant/recalculer-charges'),

  calculerChargeSurveillance: (enseignantId: number) =>
    api.get<CalculerMResponse>(
      `/enseignant/calculer-charge-surveillance?enseignantId=${enseignantId}`
    )
}
