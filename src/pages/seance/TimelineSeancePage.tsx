import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMatieres } from '@/hooks/useMatieres'
import { useSeances } from '@/hooks/useSeances'
import { useHoraires } from '@/hooks/useHoraires'
import { horaireApi } from '@/api/horaire'
import { seanceApi, SeanceDTO } from '@/api/seance'
import { matiereApi, MatiereDTO } from '@/api/matiere'
import { enseignantApi } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16]
const MIN_HOUR = 8
const MAX_HOUR = 16

type TimeBlock = {
    id: number | 'new'
    seanceId?: number
    hDebut: number
    hFin: number
    isNew: boolean
    matiereId?: number
}

export function TimelineSeancePage() {
    const { date } = useParams<{ date: string }>()
    const navigate = useNavigate()
    const { data: matieres = [] } = useMatieres()
    const { data: allSeances = [] } = useSeances()
    const { data: allHoraires = [] } = useHoraires()
    const { userId } = useAuthStore()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const timelineRef = useRef<HTMLDivElement>(null)

    // Parse date
    const dateObj = date ? new Date(date) : new Date()
    const [jour, mois, annee] = date ? date.split('-').map(Number) : [dateObj.getDate(), dateObj.getMonth() + 1, dateObj.getFullYear()]

    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Filter seances for this date
    const dateSeances = allSeances.filter(s => s.seanceDate === date)

    // Time blocks state
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
    const [selectedBlockId, setSelectedBlockId] = useState<number | 'new' | null>(null)

    // Drag state
    const [isDragging, setIsDragging] = useState(false)
    const [dragType, setDragType] = useState<'create' | 'resize-start' | 'resize-end' | null>(null)
    const [dragBlockId, setDragBlockId] = useState<number | 'new' | null>(null)

    // Form state
    const [selectedMatiereId, setSelectedMatiereId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    // Mode detection (CREATE or EDIT)
    const [mode, setMode] = useState<'CREATE' | 'EDIT' | null>(null)

    // Initialize time blocks from existing seances
    useEffect(() => {
        const blocks: TimeBlock[] = dateSeances.map(s => ({
            id: s.id,
            seanceId: s.id,
            hDebut: s.horaire?.embHoraire?.hDebut ?? MIN_HOUR,
            hFin: s.horaire?.embHoraire?.hFin ?? MIN_HOUR + 2,
            isNew: false,
            matiereId: s.matieres?.[0]?.id
        }))

        setTimeBlocks(blocks)
    }, [dateSeances.length, date])

    // When a block is selected, determine CREATE or EDIT mode
    useEffect(() => {
        if (!selectedBlockId) {
            setMode(null)
            setSelectedMatiereId('')
            return
        }

        const block = timeBlocks.find(b => b.id === selectedBlockId)
        if (!block) return

        if (block.isNew) {
            // New block → CREATE mode
            setMode('CREATE')
            setSelectedMatiereId('')
        } else {
            // Existing block → EDIT mode
            setMode('EDIT')
            // Preload matiere if exists
            if (block.matiereId) {
                setSelectedMatiereId(String(block.matiereId))
            }
        }
    }, [selectedBlockId, timeBlocks])

    // Convert pixel to hour with snapping
    const pixelToHour = (pixelX: number): number => {
        if (!timelineRef.current) return MIN_HOUR

        const rect = timelineRef.current.getBoundingClientRect()
        const relativeX = Math.max(0, Math.min(pixelX - rect.left, rect.width))

        const hourRange = MAX_HOUR - MIN_HOUR
        const rawHour = MIN_HOUR + (relativeX / rect.width) * hourRange

        return Math.max(MIN_HOUR, Math.min(MAX_HOUR, Math.round(rawHour)))
    }

    // Mouse down on timeline (create new)
    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const hour = pixelToHour(e.clientX)

        const newBlock: TimeBlock = {
            id: 'new',
            hDebut: hour,
            hFin: hour,
            isNew: true
        }

        setTimeBlocks(prev => [...prev.filter(b => b.id !== 'new'), newBlock])
        setSelectedBlockId('new')
        setDragBlockId('new')
        setDragType('resize-end')
        setIsDragging(true)
    }

    // Mouse down on block edge (resize)
    const handleBlockEdgeMouseDown = (e: React.MouseEvent, blockId: number | 'new', edge: 'start' | 'end') => {
        e.stopPropagation()
        setDragBlockId(blockId)
        setDragType(edge === 'start' ? 'resize-start' : 'resize-end')
        setIsDragging(true)
    }

    // Mouse down on block body (select)
    const handleBlockClick = (blockId: number | 'new') => {
        setSelectedBlockId(blockId)
    }

    // Mouse move
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !dragBlockId) return

        const hour = pixelToHour(e.clientX)

        setTimeBlocks(prev => prev.map(block => {
            if (block.id !== dragBlockId) return block

            if (dragType === 'resize-start') {
                const newStart = Math.min(hour, block.hFin - 1)
                return { ...block, hDebut: newStart }
            } else if (dragType === 'resize-end') {
                const newEnd = Math.max(hour, block.hDebut + 1)
                return { ...block, hFin: newEnd }
            }

            return block
        }))
    }

    // Mouse up
    const handleMouseUp = () => {
        setIsDragging(false)
        setDragType(null)
        setDragBlockId(null)
    }

    // Delete block
    const handleDeleteBlock = (blockId: number | 'new') => {
        setTimeBlocks(prev => prev.filter(b => b.id !== blockId))
        if (selectedBlockId === blockId) {
            setSelectedBlockId(null)
            setSelectedMatiereId('')
        }
    }

    // Get selected block
    const selectedBlock = timeBlocks.find(b => b.id === selectedBlockId)

    // Validate form
    const validate = (): string[] => {
        const validationErrors: string[] = []

        if (!selectedBlock) {
            validationErrors.push('Veuillez sélectionner ou créer une plage horaire')
            return validationErrors
        }

        if (!selectedMatiereId) {
            validationErrors.push('Veuillez sélectionner une matière')
        }

        if (selectedBlock.hDebut < MIN_HOUR) {
            validationErrors.push(`Heure de début minimum: ${MIN_HOUR}h`)
        }

        if (selectedBlock.hFin > MAX_HOUR) {
            validationErrors.push(`Heure de fin maximum: ${MAX_HOUR}h`)
        }

        if (selectedBlock.hFin <= selectedBlock.hDebut) {
            validationErrors.push('Heure de fin doit être supérieure à heure de début')
        }

        return validationErrors
    }

    // MAIN WORKFLOW: Horaire → Seance → Matiere
    const handleSubmit = async () => {
        const validationErrors = validate()

        if (validationErrors.length > 0) {
            setErrors(validationErrors)
            return
        }

        if (!selectedBlock || !userId) return

        setErrors([])
        setIsSubmitting(true)

        try {
            const matiere = matieres.find(m => m.id === parseInt(selectedMatiereId))
            if (!matiere) throw new Error('Matière non trouvée')

            const { hDebut, hFin } = selectedBlock

            // STEP 1: RESOLVE HORAIRE (find existing or create new)
            console.log('Step 1: Resolving horaire...', { hDebut, hFin })
            let horaireResolved = false

            try {
                await horaireApi.get(hDebut, hFin)
                horaireResolved = true
                console.log('Horaire exists')
            } catch {
                console.log('Horaire not found, creating...')
                await horaireApi.add({ hDebut, hFin })
                horaireResolved = true
                console.log('Horaire created')
            }

            if (!horaireResolved) {
                throw new Error('Failed to resolve horaire')
            }

            // STEP 2: HANDLE SEANCE (CREATE or EDIT mode)
            let seanceId: number

            if (mode === 'CREATE') {
                // CREATE MODE: Create new seance
                console.log('Step 2: Creating new seance...')

                const seancePayload: SeanceDTO = {
                    jour: annee,
                    mois,
                    annee: jour,
                    horaireHDebut: hDebut,
                    horaireHFin: hFin
                }

                const seanceResponse = await seanceApi.add(seancePayload)
                seanceId = seanceResponse.data.id
                console.log('Seance created:', seanceId)

            } else {
                // EDIT MODE: Update existing seance
                console.log('Step 2: Updating existing seance...')

                if (!selectedBlock.seanceId) {
                    throw new Error('Seance ID not found')
                }

                const seancePayload: SeanceDTO = {
                    jour: annee,
                    mois,
                    annee: jour,
                    horaireHDebut: hDebut,
                    horaireHFin: hFin
                }

                await seanceApi.edit(selectedBlock.seanceId, seancePayload)
                seanceId = selectedBlock.seanceId
                console.log('Seance updated:', seanceId)
            }

            // STEP 3: LINK MATIERE TO SEANCE
            console.log('Step 3: Linking matiere to seance...')
            const matierePayload: MatiereDTO = {
                nom: matiere.nom,
                nbPaquets: matiere.nbPaquets,
                seanceId
            }
            await matiereApi.edit(matiere.id, matierePayload)
            console.log('Matiere linked')

            // STEP 4: SUBMIT VOEU (only in CREATE mode)
            if (mode === 'CREATE') {
                console.log('Step 4: Submitting voeu...')
                await seanceApi.soumettreVoeu(userId, seanceId)
                console.log('Voeu submitted')
            }

            // STEP 5: RECALCULATE CHARGES
            console.log('Step 5: Recalculating charges...')
            await enseignantApi.recalcCharges()
            console.log('Charges recalculated')

            // Success
            toast({
                title: mode === 'CREATE' ? 'Vœu soumis avec succès!' : 'Vœu modifié avec succès!',
                description: 'La séance a été ' + (mode === 'CREATE' ? 'créée' : 'mise à jour')
            })

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['horaires'] })
            queryClient.invalidateQueries({ queryKey: ['matieres'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            // Navigate back
            navigate('/dashboard')

        } catch (error: any) {
            console.error('Workflow failed:', error)
            toast({
                title: 'Erreur',
                description: error.message || 'Une erreur est survenue',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Calculate block position and width
    const getBlockStyle = (block: TimeBlock) => {
        const startPercent = ((block.hDebut - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100
        const widthPercent = ((block.hFin - block.hDebut) / (MAX_HOUR - MIN_HOUR)) * 100

        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Gérer les séances</h1>
                <p className="text-slate-600 capitalize">{formattedDate}</p>
            </div>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Plages horaires</CardTitle>
                    <p className="text-sm text-slate-500">
                        Créez ou modifiez les plages horaires. Sélectionnez une plage pour choisir la matière.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {/* Hour header */}
                        <div className="flex">
                            <div className="w-32 flex-shrink-0" />
                            <div
                                ref={timelineRef}
                                className="relative flex-1 h-8 bg-slate-50"
                            >
                                {HOURS.map((hour, index) => (
                                    <div
                                        key={hour}
                                        className="absolute top-0 bottom-0 flex flex-col items-start"
                                        style={{ left: `${(index / (HOURS.length - 1)) * 100}%` }}
                                    >
                                        <div className="h-full border-l border-slate-300" />
                                        <span className="absolute -bottom-5 -translate-x-1/2 text-xs font-medium text-slate-600">
                                            {hour}h
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="w-16 flex-shrink-0" />
                        </div>

                        {/* Existing seances */}
                        {timeBlocks.filter(b => !b.isNew).map((block) => (
                            <div key={block.id} className="flex items-center">
                                <div className="w-32 flex-shrink-0 pr-4">
                                    <span className="text-sm font-medium text-slate-700">
                                        Séance #{block.seanceId}
                                    </span>
                                </div>
                                <div className="relative flex-1 h-12 bg-slate-100 rounded">
                                    <div
                                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${selectedBlockId === block.id
                                                ? 'bg-blue-500 ring-2 ring-blue-600'
                                                : 'bg-blue-400 hover:bg-blue-500'
                                            }`}
                                        style={getBlockStyle(block)}
                                        onClick={() => handleBlockClick(block.id)}
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-700"
                                            onMouseDown={(e) => handleBlockEdgeMouseDown(e, block.id, 'start')}
                                        />
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-700"
                                            onMouseDown={(e) => handleBlockEdgeMouseDown(e, block.id, 'end')}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
                                            {block.hDebut}h - {block.hFin}h
                                        </div>
                                    </div>
                                </div>
                                <div className="w-16 flex-shrink-0 pl-2">
                                    <button
                                        onClick={() => handleDeleteBlock(block.id)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* New seance row */}
                        <div className="flex items-center">
                            <div className="w-32 flex-shrink-0 pr-4">
                                <span className="text-sm font-medium text-green-700">
                                    + Nouvelle séance
                                </span>
                            </div>
                            <div
                                className="relative flex-1 h-12 bg-green-50 rounded cursor-crosshair border-2 border-dashed border-green-300"
                                onMouseDown={handleTimelineMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {timeBlocks.filter(b => b.isNew).map((block) => (
                                    <div
                                        key={block.id}
                                        className={`absolute top-1 bottom-1 rounded cursor-pointer ${selectedBlockId === block.id
                                                ? 'bg-green-500 ring-2 ring-green-600'
                                                : 'bg-green-400 hover:bg-green-500'
                                            }`}
                                        style={getBlockStyle(block)}
                                        onClick={() => handleBlockClick(block.id)}
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-green-700"
                                            onMouseDown={(e) => handleBlockEdgeMouseDown(e, block.id, 'start')}
                                        />
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-green-700"
                                            onMouseDown={(e) => handleBlockEdgeMouseDown(e, block.id, 'end')}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
                                            {block.hDebut}h - {block.hFin}h
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="w-16 flex-shrink-0 pl-2">
                                {timeBlocks.some(b => b.isNew) && (
                                    <button
                                        onClick={() => handleDeleteBlock('new')}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form - Only shown when block is selected */}
            {selectedBlock && mode && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {mode === 'CREATE' ? 'Nouvelle séance' : 'Modifier la séance'}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            {mode === 'CREATE'
                                ? 'Créez une nouvelle séance et soumettez votre vœu'
                                : 'Modifiez la séance existante'}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mode indicator */}
                        <div className={`${mode === 'CREATE' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
                            <p className="text-sm font-medium">
                                Mode: <strong>{mode === 'CREATE' ? 'CRÉATION' : 'MODIFICATION'}</strong>
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Plage horaire: {selectedBlock.hDebut}h00 - {selectedBlock.hFin}h00
                            </p>
                        </div>

                        {/* Matiere selection - ALWAYS VISIBLE */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Matière *</label>
                            <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez une matière" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matieres.map((matiere) => (
                                        <SelectItem key={matiere.id} value={String(matiere.id)}>
                                            {matiere.nom} ({matiere.nbPaquets} paquets)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Hour inputs (synchronized with timeline) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Heure de début</label>
                                <Input
                                    type="number"
                                    value={selectedBlock.hDebut}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || MIN_HOUR
                                        setTimeBlocks(prev => prev.map(b =>
                                            b.id === selectedBlockId ? { ...b, hDebut: newValue } : b
                                        ))
                                    }}
                                    min={MIN_HOUR}
                                    max={MAX_HOUR - 1}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Heure de fin</label>
                                <Input
                                    type="number"
                                    value={selectedBlock.hFin}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || MIN_HOUR + 1
                                        setTimeBlocks(prev => prev.map(b =>
                                            b.id === selectedBlockId ? { ...b, hFin: newValue } : b
                                        ))
                                    }}
                                    min={MIN_HOUR + 1}
                                    max={MAX_HOUR}
                                />
                            </div>
                        </div>

                        {/* Validation errors */}
                        {errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <ul className="text-sm text-red-700 space-y-1">
                                    {errors.map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Workflow info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-900">
                                <strong>Cette action va:</strong>
                            </p>
                            <ul className="text-sm text-blue-900 list-disc list-inside mt-1 space-y-1">
                                <li>Résoudre ou créer l'horaire {selectedBlock.hDebut}h00 - {selectedBlock.hFin}h00</li>
                                <li>{mode === 'CREATE' ? 'Créer une nouvelle séance' : 'Mettre à jour la séance existante'}</li>
                                <li>Lier la matière sélectionnée</li>
                                {mode === 'CREATE' && <li>Soumettre votre vœu de surveillance</li>}
                                <li>Recalculer les charges</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Annuler
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedBlock || !mode}
                >
                    {isSubmitting
                        ? 'En cours...'
                        : mode === 'CREATE'
                            ? 'Soumettre un vœu'
                            : 'Modifier le vœu'}
                </Button>
            </div>
        </div>
    )
}
