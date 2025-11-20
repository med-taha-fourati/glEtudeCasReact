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
    isSaturee,
    requiredSurveillants,
    lockMutation,
    affecterMutation,
    terminerMutation
  } = useSeances()

  const [confirmId, setConfirmId] = useState<number | null>(null)

  if (isLoading) return <div>Chargement des séances...</div>
  if (isError) return <div>Impossible de charger les séances.</div>

  const seances = data ?? []

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
            <TableHead>Date début</TableHead>
            <TableHead>Date fin</TableHead>
            <TableHead>Salle</TableHead>
            <TableHead>Surveillants</TableHead>
            <TableHead>Requis</TableHead>
            <TableHead>Saturation</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seances.map((seance) => {
            const saturation = isSaturee(seance)
            const required = requiredSurveillants(seance)

            return (
              <TableRow key={seance.id}>
                <TableCell>{new Date(seance.dateDebut).toLocaleString()}</TableCell>
                <TableCell>{new Date(seance.dateFin).toLocaleString()}</TableCell>
                <TableCell>{seance.salle ?? 'N/A'}</TableCell>
                <TableCell>{seance.currentSurveillants}</TableCell>
                <TableCell>{required}</TableCell>
                <TableCell>
                  <Badge variant={saturation ? 'destructive' : 'secondary'}>
                    {saturation ? 'Saturée' : 'Disponible'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={seance.isLocked ? 'outline' : 'secondary'}>
                    {seance.isLocked ? 'Verrouillée' : 'Ouverte'}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={seance.isLocked || lockMutation.isPending}
                    onClick={() => lockMutation.mutate(seance.id)}
                  >
                    Verrouiller
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={terminerMutation.isPending}
                    onClick={() => setConfirmId(seance.id)}
                  >
                    Terminer
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
