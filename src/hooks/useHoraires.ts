import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { horaireApi, HoraireDTO } from '@/api/horaire'
import { useToast } from '@/components/ui/use-toast'

export function useHoraires() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['horaires'],
    queryFn: () => horaireApi.fetchAll().then((res) => res.data),
    staleTime: 30_000
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['horaires'] })

  const addMutation = useMutation({
    mutationFn: (payload: HoraireDTO) => horaireApi.add(payload),
    onSuccess: () => {
      toast({ title: 'Horaire créé' })
      invalidate()
    }
  })

  const editMutation = useMutation({
    mutationFn: ({ oldHDebut, oldHFin, payload }: {
      oldHDebut: number
      oldHFin: number
      payload: HoraireDTO
    }) => horaireApi.edit(oldHDebut, oldHFin, payload),
    onSuccess: () => {
      toast({ title: 'Horaire mis à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: ({ hDebut, hFin }: { hDebut: number; hFin: number }) =>
      horaireApi.delete(hDebut, hFin),
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
