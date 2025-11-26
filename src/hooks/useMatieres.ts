import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matiereApi, Matiere } from '@/api/matiere'
import { useToast } from '@/components/ui/use-toast'

export function useMatieres() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['matieres'],
    queryFn: () => matiereApi.fetchAll().then((res) => res.data)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['matieres'] })

  const addMutation = useMutation({
    mutationFn: (payload: import('@/api/matiere').MatiereDTO) => matiereApi.add(payload),
    onSuccess: () => {
      toast({ title: 'Matière ajoutée' })
      invalidate()
    }
  })

  const editMutation = useMutation({
    mutationFn: (payload: { id: number } & import('@/api/matiere').MatiereDTO) => {
      const { id, ...rest } = payload
      return matiereApi.edit(id, rest)
    },
    onSuccess: () => {
      toast({ title: 'Matière mise à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => matiereApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Matière supprimée' })
      invalidate()
    }
  })

  return {
    ...listQuery,
    addMutation,
    editMutation,
    deleteMutation
  }
}
