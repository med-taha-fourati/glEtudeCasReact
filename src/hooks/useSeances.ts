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

  const lockMutation = useMutation({
    mutationFn: (id: number) => seanceApi.lock(id),
    onSuccess: () => {
      toast({ title: 'Séance verrouillée' })
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
    mutationFn: (payload: { seanceId: number }) => seanceApi.soumettreVoeu(payload),
    onSuccess: () => toast({ title: 'Vœu soumis' })
  })

  const requiredSurveillants = (seance: Pick<Seance, 'nbPaquetsTotal'>) => seance.nbPaquetsTotal * 1.5
  const isSaturee = (seance: Seance) => seance.currentSurveillants >= requiredSurveillants(seance)

  return {
    ...listQuery,
    lockMutation,
    affecterMutation,
    terminerMutation,
    soumettreVoeuMutation,
    requiredSurveillants,
    isSaturee
  }
}
