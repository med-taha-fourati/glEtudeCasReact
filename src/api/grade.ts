import api from './api'

// Full entity type (returned from backend)
export type Grade = {
  id: number
  grade: number
  chargeSurveillance: number
  enseignants?: Array<{
    id: number
    nom: string
    prenom: string
  }>
}

// DTO type (for creation/editing)
export type GradeDTO = {
  grade: number
  chargeSurveillance: number
}

export const gradeApi = {
  fetchAll: () => api.get<Grade[]>('/grade/'),
  fetch: (id: number) => api.get<Grade>(`/grade/fetch?gradeId=${id}`),
  add: (payload: GradeDTO) => api.post<Grade>('/grade/add', payload),
  edit: (id: number, payload: GradeDTO) => api.put<Grade>(`/grade/edit?id=${id}`, payload),
  delete: (id: number) => api.delete<boolean>(`/grade/delete?id=${id}`)
}
