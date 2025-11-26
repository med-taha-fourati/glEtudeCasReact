import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSeances } from '@/hooks/useSeances'

export function SeanceListPage() {
  const {
    data,
    isLoading,
    isError,
    verrouillerMutation,
    affecterMutation,
    terminerMutation
  } = useSeances()

  const [confirmId, setConfirmId] = useState<number | null>(null)

  if (isLoading) return <div>Chargement des séances...</div>
  if (isError) return <div>Impossible de charger les séances.</div>

  const seances = data ?? []

  // Calculate required surveillants based on matieres
  const calculateRequired = (seance: any) => {
    if (!seance.matieres || seance.matieres.length === 0) return 0
    const totalPaquets = seance.matieres.reduce((sum: number, m: any) => sum + (m.nbPaquets || 0), 0)
    return Math.ceil(totalPaquets * 1.5)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Séances d&apos;examen</h1>
          <p className="text-sm text-slate-500">Gestion des surveillants et saturation</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={affecterMutation.isPending}
            onClick={() => affecterMutation.mutate()}
          >
            {affecterMutation.isPending ? 'Affectation...' : 'Affecter automatiquement'}
          </Button>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Horaire</TableHead>
            <TableHead>Matières</TableHead>
            <TableHead>Surveillants</TableHead>
            <TableHead>Requis</TableHead>
            <TableHead>Saturation</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seances.map((seance) => {
            const nbSurveillants = seance.enseignants?.length ?? 0
            const required = calculateRequired(seance)
            const isSaturee = nbSurveillants >= required
            const matiereNames = seance.matieres?.map((m: any) => m.nom).join(', ') || 'Aucune'
            const horaire = seance.horaire?.embHoraire
            const horaireStr = horaire ? `${horaire.hDebut}h - ${horaire.hFin}h` : 'N/A'

            return (
              <TableRow key={seance.id}>
                <TableCell>{new Date(seance.seanceDate).toLocaleDateString()}</TableCell>
                <TableCell>{horaireStr}</TableCell>
                <TableCell className="max-w-xs truncate">{matiereNames}</TableCell>
                <TableCell>{nbSurveillants}</TableCell>
                <TableCell>{required}</TableCell>
                <TableCell>
                  <Badge variant={isSaturee ? 'destructive' : 'secondary'}>
                    {isSaturee ? 'Saturée' : 'Disponible'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={seance.verrouillee ? 'outline' : 'secondary'}>
                    {seance.verrouillee ? 'Verrouillée' : 'Ouverte'}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={seance.verrouillee || verrouillerMutation.isPending}
                    onClick={() => verrouillerMutation.mutate(true)}
                  >
                    Verrouiller
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={terminerMutation.isPending || seance.passeeExamen}
                    onClick={() => setConfirmId(seance.id)}
                  >
                    {seance.passeeExamen ? 'Terminé' : 'Terminer'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={confirmId !== null} onOpenChange={() => setConfirmId(null)}>
        <DialogHeader>
          <DialogTitle>Terminer l&apos;examen ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Cette action clôture définitivement la séance sélectionnée.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmId(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={terminerMutation.isPending}
            onClick={() => {
              if (confirmId) terminerMutation.mutate(confirmId)
              setConfirmId(null)
            }}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  )
}
