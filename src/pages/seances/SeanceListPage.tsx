import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSeances } from '@/hooks/useSeances'
import { useHoraires } from '@/hooks/useHoraires'
import { useAuthStore } from '@/store/auth'
import { SeanceDTO } from '@/api/seance'

type SeanceFormData = {
  jour: number
  mois: number
  annee: number
  horaireHDebut: number
  horaireHFin: number
}

export function SeanceListPage() {
  const {
    data,
    isLoading,
    isError,
    verrouillerMutation,
    affecterMutation,
    terminerMutation,
    addMutation,
    editMutation,
    deleteMutation
  } = useSeances()

  const { data: horaires = [] } = useHoraires()
  const { role } = useAuthStore()
  const isAdmin = role === 'ADMIN'

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editSeance, setEditSeance] = useState<any | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState<SeanceFormData>({
    jour: 1,
    mois: 1,
    annee: new Date().getFullYear(),
    horaireHDebut: 8,
    horaireHFin: 10
  })

  if (isLoading) return <div>Chargement des séances...</div>
  if (isError) return <div>Impossible de charger les séances.</div>

  const seances = data ?? []

  // Calculate required surveillants based on matieres
  const calculateRequired = (seance: any) => {
    if (!seance.matieres || seance.matieres.length === 0) return 0
    const totalPaquets = seance.matieres.reduce((sum: number, m: any) => sum + (m.nbPaquets || 0), 0)
    return Math.ceil(totalPaquets * 1.5)
  }

  const handleCreate = () => {
    const payload: SeanceDTO = {
      jour: formData.jour,
      mois: formData.mois,
      annee: formData.annee,
      horaireHDebut: formData.horaireHDebut,
      horaireHFin: formData.horaireHFin
    }

    addMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setFormData({
          jour: 1,
          mois: 1,
          annee: new Date().getFullYear(),
          horaireHDebut: 8,
          horaireHFin: 10
        })
      }
    })
  }

  const handleEdit = () => {
    if (!editSeance) return

    const payload: SeanceDTO = {
      jour: formData.jour,
      mois: formData.mois,
      annee: formData.annee,
      horaireHDebut: formData.horaireHDebut,
      horaireHFin: formData.horaireHFin
    }

    editMutation.mutate({ id: editSeance.id, payload }, {
      onSuccess: () => {
        setEditSeance(null)
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null)
      }
    })
  }

  const openEditModal = (seance: any) => {
    setEditSeance(seance)
    // Parse date
    const date = new Date(seance.seanceDate)
    setFormData({
      jour: date.getDate(),
      mois: date.getMonth() + 1,
      annee: date.getFullYear(),
      horaireHDebut: seance.horaire?.embHoraire?.hdebut ?? 8,
      horaireHFin: seance.horaire?.embHoraire?.hfin ?? 10
    })
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Séances d&apos;examen</h1>
          <p className="text-sm text-slate-500">Gestion des surveillants et saturation</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)}>
              + Créer une séance
            </Button>
          )}
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
            const horaireStr = horaire ? `${horaire.hdebut}h - ${horaire.hfin}h` : 'N/A'

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
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(seance)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(seance.id)}
                      >
                        Supprimer
                      </Button>
                    </>
                  )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || editSeance !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setEditSeance(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSeance ? 'Modifier la séance' : 'Créer une séance'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jour</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={formData.jour}
                  onChange={(e) => setFormData({ ...formData, jour: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mois</label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={formData.mois}
                  onChange={(e) => setFormData({ ...formData, mois: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Année</label>
                <Input
                  type="number"
                  value={formData.annee}
                  onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Heure début</label>
                <Input
                  type="number"
                  min={8}
                  max={16}
                  value={formData.horaireHDebut}
                  onChange={(e) => setFormData({ ...formData, horaireHDebut: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Heure fin</label>
                <Input
                  type="number"
                  min={8}
                  max={16}
                  value={formData.horaireHFin}
                  onChange={(e) => setFormData({ ...formData, horaireHFin: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false)
              setEditSeance(null)
            }}>
              Annuler
            </Button>
            <Button onClick={editSeance ? handleEdit : handleCreate}>
              {editSeance ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la séance ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Cette action est irréversible. La séance sera définitivement supprimée.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminer Confirmation Dialog */}
      <Dialog open={confirmId !== null} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
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
        </DialogContent>
      </Dialog>
    </section>
  )
}
