import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Matiere = {
    id: number
    nom: string
    nbPaquets: number
}

type Horaire = {
    embHoraire: {
        hDebut: number
        hFin: number
    }
}

type Props = {
    open: boolean
    onClose: () => void
    selectedDate: Date
    availableMatieres: Matiere[]
    availableHoraires: Horaire[]
    onSubmit: (data: {
        matiereId: number
        matiereName: string
        matiereNbPaquets: number
        hDebut: number
        hFin: number
    }) => void
    isLoading: boolean
}

export function SeanceSubmissionModal({
    open,
    onClose,
    selectedDate,
    availableMatieres,
    availableHoraires,
    onSubmit,
    isLoading
}: Props) {
    const [selectedMatiereId, setSelectedMatiereId] = useState<string>('')
    const [selectedHoraire, setSelectedHoraire] = useState<string>('')

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleSubmit = () => {
        if (!selectedMatiereId || !selectedHoraire) {
            return
        }

        const matiere = availableMatieres.find(m => m.id === parseInt(selectedMatiereId))
        const [hDebut, hFin] = selectedHoraire.split('-').map(Number)

        if (matiere) {
            onSubmit({
                matiereId: matiere.id,
                matiereName: matiere.nom,
                matiereNbPaquets: matiere.nbPaquets,
                hDebut,
                hFin
            })
        }
    }

    const handleClose = () => {
        setSelectedMatiereId('')
        setSelectedHoraire('')
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créer une séance et soumettre un vœu</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Date sélectionnée</p>
                        <p className="text-lg font-semibold capitalize">{formatDate(selectedDate)}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Matière *</label>
                        <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une matière" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMatieres.map((matiere) => (
                                    <SelectItem key={matiere.id} value={String(matiere.id)}>
                                        {matiere.nom} ({matiere.nbPaquets} paquets)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Horaire *</label>
                        <Select value={selectedHoraire} onValueChange={setSelectedHoraire}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un horaire" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableHoraires.map((horaire, index) => {
                                    const { hDebut, hFin } = horaire.embHoraire
                                    const value = `${hDebut}-${hFin}`
                                    return (
                                        <SelectItem key={index} value={value}>
                                            {hDebut}h00 - {hFin}h00
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            <strong>Cette action va:</strong>
                        </p>
                        <ul className="text-sm text-blue-900 list-disc list-inside mt-2 space-y-1">
                            <li>Utiliser ou créer l'horaire sélectionné</li>
                            <li>Créer une nouvelle séance pour le {selectedDate.toLocaleDateString('fr-FR')}</li>
                            <li>Lier la matière sélectionnée à cette séance</li>
                            <li>Soumettre automatiquement votre vœu de surveillance</li>
                            <li>Recalculer les charges de surveillance</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedMatiereId || !selectedHoraire}
                    >
                        {isLoading ? 'Création en cours...' : 'Confirmer et créer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
