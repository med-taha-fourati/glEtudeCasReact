import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seanceApi, Seance, SeanceDTO } from '@/api/seance'
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

  const addMutation = useMutation({
    mutationFn: (payload: SeanceDTO) => seanceApi.add(payload),
    onSuccess: () => {
      toast({ title: 'Séance créée avec succès' })
      invalidate()
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de créer la séance',
        variant: 'destructive'
      })
    }
  })

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SeanceDTO }) => seanceApi.edit(id, payload),
    onSuccess: () => {
      toast({ title: 'Séance modifiée avec succès' })
      invalidate()
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de modifier la séance',
        variant: 'destructive'
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => seanceApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Séance supprimée avec succès' })
      invalidate()
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de supprimer la séance',
        variant: 'destructive'
      })
    }
  })

  const verrouillerMutation = useMutation({
    mutationFn: (verrouiller: boolean) => seanceApi.verrouiller(verrouiller),
    onSuccess: (_: any, variables: any) => {
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
    addMutation,
    editMutation,
    deleteMutation,
    verrouillerMutation,
    affecterMutation,
    terminerMutation,
    soumettreVoeuMutation
  }
}
