import api from './api'

export type Grade = {
  id: number
  libelle: string
  coefficient: number
  chargeSurveillance: number
}

export const gradeApi = {
  fetchAll: () => api.get<Grade[]>('/grade/fetch'),
  search: (term: string) => api.get<Grade[]>(`/grade/search?term=${term}`),
  add: (payload: Partial<Grade>) => api.post('/grade/add', payload),
  edit: (payload: Partial<Grade>) => api.put('/grade/edit', payload),
  delete: (id: number) => api.delete(`/grade/delete?id=${id}`)
}
