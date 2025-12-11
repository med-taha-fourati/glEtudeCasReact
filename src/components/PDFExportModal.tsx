import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { generateSurveillancePDF } from '@/utils/pdfGenerator'
import { Loader2 } from 'lucide-react'
import type { AppError } from '@/utils/errorHandling'

type Enseignant = {
    id: number
    nom: string
    prenom: string
    etatSurveillant: 'PAS_SURVEILLANT' | 'SURVEILLANT'
    seances?: Array<any>
}

type PDFExportModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    role: 'ADMIN' | 'ENSEIGNANT'
    userId: number
    enseignants: Enseignant[]
    seances: Array<any>  // ADD: Full seances list
}

export function PDFExportModal({
    open,
    onOpenChange,
    role,
    userId,
    enseignants,
    seances  // ADD: Receive seances
}: PDFExportModalProps) {
    const { toast } = useToast()
    const [selectedEnseignantId, setSelectedEnseignantId] = useState<string>('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)

    // Get target enseignant
    const targetEnseignantId = role === 'ENSEIGNANT' ? userId : parseInt(selectedEnseignantId)
    const targetEnseignant = enseignants.find(e => e.id === targetEnseignantId)

    // Filter enseignants: only SURVEILLANT
    const surveillants = enseignants.filter(e => e.etatSurveillant === 'SURVEILLANT')

    // Validation
    const canGenerate = () => {
        if (!targetEnseignant) return false
        if (!startDate || !endDate) return false
        if (new Date(startDate) > new Date(endDate)) return false
        if (targetEnseignant.etatSurveillant !== 'SURVEILLANT') return false
        return true
    }
//TODO: dont show matieres
    const handleGenerate = async () => {
        if (!canGenerate() || !targetEnseignant) {
            toast({
                title: 'Validation échouée',
                description: 'Veuillez remplir tous les champs correctement',
                variant: 'destructive'
            })
            return
        }

        console.log('=== Modal Filtering Debug ===')
        console.log('Total seances:', seances.length)
        console.log('Target enseignant:', targetEnseignant.nom, targetEnseignant.prenom)
        console.log('Enseignant seances:', targetEnseignant.seances)
        console.log('Start date:', startDate)
        console.log('End date:', endDate)

        // Extract séance IDs from enseignant's assignments (SOURCE OF TRUTH)
        const enseignantSeanceIds = new Set(
            targetEnseignant.seances?.map((s: any) => s.id) || []
        )

        console.log('Enseignant assigned to séance IDs:', Array.from(enseignantSeanceIds))

        // Filter global seances by matching IDs (gets full matière data)
        const seancesForEnseignant = seances.filter(s =>
            enseignantSeanceIds.has(s.id)
        )

        console.log('Matching séances with full data:', seancesForEnseignant.length)

        // Filter by date range
        const seancesInRange = seancesForEnseignant.filter(s => {
            const dateStr = s.seanceDate.split('T')[0]
            const inRange = dateStr >= startDate && dateStr <= endDate
            console.log(`  Seance ${s.id} (${s.matieres?.[0]?.nom}) ${dateStr}: ${inRange ? '✓' : '✗'}`)
            return inRange
        })

        console.log('Séances in date range:', seancesInRange.length)

        if (seancesInRange.length === 0) {
            toast({
                title: 'Aucune séance',
                description: 'Aucune séance trouvée pour cette période',
                variant: 'destructive'
            })
            return
        }

        setIsGenerating(true)

        try {
            // Generate PDF with full seances data
            await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
            generateSurveillancePDF(targetEnseignant, seancesInRange, startDate, endDate)

            toast({
                title: 'PDF généré',
                description: 'Le PDF a été téléchargé avec succès'
            })

            onOpenChange(false)
        } catch (err) {
            const error = err as AppError
            console.error('PDF generation error:', error)
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {role === 'ADMIN' ? 'Exporter PDF de surveillance' : 'Mon PDF de surveillance'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Enseignant selector (ADMIN only) */}
                    {role === 'ADMIN' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Enseignant</label>
                            <Select value={selectedEnseignantId} onValueChange={setSelectedEnseignantId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un enseignant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {surveillants.map(e => (
                                        <SelectItem key={e.id} value={String(e.id)}>
                                            {e.nom} {e.prenom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date de début</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date de fin</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                            />
                        </div>
                    </div>

                    {/* Validation hints */}
                    {targetEnseignant && startDate && endDate && (
                        <div className="text-sm text-slate-600">
                            {new Date(startDate) > new Date(endDate) ? (
                                <p className="text-red-600">⚠️ Date de fin invalide</p>
                            ) : (
                                <p className="text-green-600">✓ Période valide</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                        Annuler
                    </Button>
                    <Button onClick={handleGenerate} disabled={!canGenerate() || isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Générer PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
