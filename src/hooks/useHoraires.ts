import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { horaireApi, Horaire } from '@/api/horaire'
import { useToast } from '@/components/ui/use-toast'

export function useHoraires() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['horaires'],
    queryFn: () => horaireApi.fetchAll().then((res) => res.data)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['horaires'] })

  const addMutation = useMutation({
    mutationFn: (payload: Partial<Horaire>) => horaireApi.add(payload),
    onSuccess: () => {
      toast({ title: 'Horaire ajouté' })
      invalidate()
    }
  })

  const editMutation = useMutation({
    mutationFn: (payload: Partial<Horaire>) => horaireApi.edit(payload),
    onSuccess: () => {
      toast({ title: 'Horaire mis à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => horaireApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Horaire supprimé' })
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
