import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { seanceApi, Seance } from '@/api/seance'
import { voeuApi, Voeu } from '@/api/voeu'
import { enseignantApi } from '@/api/enseignant'
import { useToast } from '@/components/ui/use-toast'

export function VoeuxPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => enseignantApi.profile().then((res) => res.data)
  })

  const { data: disponibles = [], isLoading: disponiblesLoading } = useQuery({
    queryKey: ['seances-disponibles'],
    queryFn: () => seanceApi.fetchDisponibles().then((res) => res.data)
  })

  const { data: voeux = [], isLoading: voeuxLoading } = useQuery({
    queryKey: ['voeux-mine'],
    queryFn: () => voeuApi.fetchMine().then((res) => res.data)
  })

  const submitMutation = useMutation({
    mutationFn: (payload: { seanceId: number }) => seanceApi.soumettreVoeu(payload),
    onSuccess: () => {
      toast({ title: 'Vœu soumis' })
      queryClient.invalidateQueries({ queryKey: ['seances-disponibles'] })
      queryClient.invalidateQueries({ queryKey: ['voeux-mine'] })
    }
  })

  const maxVoeux = (profile as any)?.grade?.chargeSurveillance ?? 0

  const remainingVoeux = useMemo(() => {
    if (!maxVoeux) return 0
    return Math.max(maxVoeux - voeux.length, 0)
  }, [maxVoeux, voeux.length])

  const handleSubmitVoeu = (seance: Seance) => {
    if (!remainingVoeux) {
      toast({ title: 'Limite atteinte', description: 'Vous avez atteint votre charge de vœux.' })
      return
    }

    submitMutation.mutate({ seanceId: seance.id })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mes vœux</h1>
          <p className="text-sm text-slate-500">
            Soumettez vos préférences de surveillance en fonction de votre charge autorisée.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Charge maximale :</span>
          <Badge variant="secondary">{maxVoeux || 0}</Badge>
          <span>/ Vœux restants :</span>
          <Badge variant={remainingVoeux > 0 ? 'default' : 'destructive'}>{remainingVoeux}</Badge>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Séances disponibles</h2>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date début</TableHead>
                <TableHead>Date fin</TableHead>
                <TableHead>Nb paquets</TableHead>
                <TableHead>Surveillants actuels</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disponiblesLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              )}
              {!disponiblesLoading && disponibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Aucune séance disponible
                  </TableCell>
                </TableRow>
              )}
              {disponibles.map((seance) => (
                <TableRow key={seance.id}>
                  <TableCell>{seance.dateDebut}</TableCell>
                  <TableCell>{seance.dateFin}</TableCell>
                  <TableCell>{seance.nbPaquetsTotal}</TableCell>
                  <TableCell>{seance.currentSurveillants}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={!remainingVoeux || submitMutation.isPending}
                      onClick={() => handleSubmitVoeu(seance)}
                    >
                      Soumettre un vœu
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historique de mes vœux</h2>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>État</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voeuxLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              )}
              {!voeuxLoading && voeux.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Aucun vœu soumis
                  </TableCell>
                </TableRow>
              )}
              {voeux.map((v: Voeu) => (
                <TableRow key={v.id}>
                  <TableCell>{v.date}</TableCell>
                  <TableCell>{v.matiere}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        v.etat === 'APPROUVE'
                          ? 'default'
                          : v.etat === 'EN_ATTENTE'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {v.etat}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
