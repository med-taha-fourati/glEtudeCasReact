import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enseignantApi } from '@/api/enseignant'
import { useToast } from '@/components/ui/use-toast'

export function useEnseignants() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  const listQuery = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => enseignantApi.fetchAll().then((res) => res.data)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['enseignants'] })

  const createMutation = useMutation({
    mutationFn: (payload: import('@/api/enseignant').EnseignantDTO) => enseignantApi.register(payload),
    onSuccess: () => {
      toast({ title: 'Enseignant créé' })
      invalidate()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number } & import('@/api/enseignant').EnseignantDTO) => {
      const { id, ...rest } = payload
      return enseignantApi.edit(id, rest)
    },
    onSuccess: () => {
      toast({ title: 'Enseignant mis à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => enseignantApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Enseignant supprimé' })
      invalidate()
    }
  })

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return listQuery.data ?? []
    return (listQuery.data ?? []).filter((enseignant: any) =>
      `${enseignant.nom ?? ''} ${enseignant.prenom ?? ''}`.toLowerCase().includes(term)
    )
  }, [listQuery.data, searchTerm])

  return {
    ...listQuery,
    data: filtered,
    rawData: listQuery.data ?? [],
    searchTerm,
    setSearchTerm,
    createMutation,
    updateMutation,
    deleteMutation
  }
}
