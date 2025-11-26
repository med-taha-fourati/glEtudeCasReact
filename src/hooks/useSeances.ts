import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seanceApi, Seance } from '@/api/seance'
import { useToast } from '@/components/ui/use-toast'

export function useSeances() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['seances'],
    queryFn: () => seanceApi.fetchAll().then((res) => res.data),
    staleTime: 30_000
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['seances'] })

  const verrouillerMutation = useMutation({
    mutationFn: (verrouiller: boolean) => seanceApi.verrouiller(verrouiller),
    onSuccess: (_, variables) => {
      toast({ title: variables ? 'Calendrier verrouillé' : 'Calendrier déverrouillé' })
      invalidate()
    }
  })

  const affecterMutation = useMutation({
    mutationFn: () => seanceApi.affecterAutomatiquement(),
    onSuccess: () => {
      toast({ title: 'Affectation automatique effectuée' })
      invalidate()
    }
  })

  const terminerMutation = useMutation({
    mutationFn: (id: number) => seanceApi.terminerExamen(id),
    onSuccess: () => {
      toast({ title: 'Examen terminé' })
      invalidate()
    }
  })

  const soumettreVoeuMutation = useMutation({
    mutationFn: (payload: { enseignantId: number; seanceId: number }) =>
      seanceApi.soumettreVoeu(payload.enseignantId, payload.seanceId),
    onSuccess: () => toast({ title: 'Vœu soumis' })
  })

  return {
    ...listQuery,
    verrouillerMutation,
    affecterMutation,
    terminerMutation,
    soumettreVoeuMutation
  }
}
