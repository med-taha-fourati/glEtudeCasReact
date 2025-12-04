import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSeances } from '@/hooks/useSeances'
import { useMatieres } from '@/hooks/useMatieres'
import { useHoraires } from '@/hooks/useHoraires'
import { useEnseignants } from '@/hooks/useEnseignants'
import { seanceApi, SeanceDTO } from '@/api/seance'
import { horaireApi } from '@/api/horaire'
import { matiereApi, MatiereDTO } from '@/api/matiere'
import { enseignantApi } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Info, Users } from 'lucide-react'

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
    const { data: allSeances = [], deleteMutation } = useSeances()
    const { data: matieres = [] } = useMatieres()
    const { data: horaires = [] } = useHoraires()
    const { data: enseignants = [] } = useEnseignants()
    const { userId, role, etatSurveillant } = useAuthStore()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const isAdmin = role === 'ADMIN'
    const isSurveillant = etatSurveillant === 'SURVEILLANT'
    const isReadOnly = !isAdmin && !isSurveillant

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
    const dateSeances = allSeances.filter((s: typeof allSeances[0]) => s.seanceDate === date)

    // ADMIN MODE STATE
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
    const [selectedBlockId, setSelectedBlockId] = useState<number | 'new' | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragType, setDragType] = useState<'create' | 'resize-start' | 'resize-end' | null>(null)
    const [dragBlockId, setDragBlockId] = useState<number | 'new' | null>(null)

    // ENSEIGNANT MODE STATE
    const [selectedSeanceId, setSelectedSeanceId] = useState<number | null>(null)

    // Form state
    const [selectedMatiereId, setSelectedMatiereId] = useState<string>('')
    const [assignedSurveillants, setAssignedSurveillants] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    // Get eligible surveillants (filtered by etatSurveillant and matiere ownership)
    const eligibleSurveillants = useMemo(() => {
        if (!isAdmin) return []

        const surveillants = enseignants.filter((e: typeof enseignants[0]) =>
            e.etatSurveillant === 'SURVEILLANT'
        )

        if (!selectedMatiereId) return surveillants

        const selectedMatiere = matieres.find((m: typeof matieres[0]) => m.id === parseInt(selectedMatiereId))
        if (!selectedMatiere) return surveillants

        // Filter out enseignants who own this matiere
        return surveillants.filter((e: typeof enseignants[0]) =>
            !e.matieres?.some((m: typeof e.matieres[0]) => m.id === selectedMatiere.id)
        )
    }, [isAdmin, enseignants, selectedMatiereId, matieres])

    // Initialize time blocks from existing seances (ADMIN MODE)
    useEffect(() => {
        if (!isAdmin) return

        const blocks: TimeBlock[] = dateSeances.map((s: typeof dateSeances[0]) => ({
            id: s.id,
            seanceId: s.id,
            hDebut: s.horaire?.embHoraire?.hdebut ?? MIN_HOUR,
            hFin: s.horaire?.embHoraire?.hfin ?? MIN_HOUR + 2,
            isNew: false,
            matiereId: s.matieres?.[0]?.id
        }))

        setTimeBlocks(blocks)
    }, [dateSeances.length, date, isAdmin])

    // Convert pixel to hour with snapping
    const pixelToHour = (pixelX: number): number => {
        if (!timelineRef.current) return MIN_HOUR

        const rect = timelineRef.current.getBoundingClientRect()
        const relativeX = Math.max(0, Math.min(pixelX - rect.left, rect.width))

        const hourRange = MAX_HOUR - MIN_HOUR
        const rawHour = MIN_HOUR + (relativeX / rect.width) * hourRange

        return Math.max(MIN_HOUR, Math.min(MAX_HOUR, Math.round(rawHour)))
    }

    // ADMIN: Mouse down on timeline (create new)
    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAdmin) return

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

    // ADMIN: Mouse down on block edge (resize)
    const handleBlockEdgeMouseDown = (e: React.MouseEvent, blockId: number | 'new', edge: 'start' | 'end') => {
        if (!isAdmin) return

        e.stopPropagation()
        setDragBlockId(blockId)
        setDragType(edge === 'start' ? 'resize-start' : 'resize-end')
        setIsDragging(true)
    }

    // ADMIN: Mouse down on block body (select)
    const handleBlockClick = (blockId: number | 'new') => {
        if (!isAdmin) return
        setSelectedBlockId(blockId)
    }

    // ADMIN: Mouse move
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAdmin || !isDragging || !dragBlockId) return

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

    // ADMIN: Mouse up
    const handleMouseUp = () => {
        if (!isAdmin) return

        setIsDragging(false)
        setDragType(null)
        setDragBlockId(null)
    }

    // Track which block we've loaded to prevent re-loading
    const loadedBlockIdRef = useRef<number | 'new' | null>(null)

    // Load assigned surveillants when selecting a block
    useEffect(() => {
        // Only run if we're selecting a different block
        if (loadedBlockIdRef.current === selectedBlockId) return

        loadedBlockIdRef.current = selectedBlockId

        if (!isAdmin || !selectedBlockId) {
            setAssignedSurveillants([])
            setSelectedMatiereId('')
            return
        }

        const block = timeBlocks.find(b => b.id === selectedBlockId)
        if (!block || block.isNew) {
            setAssignedSurveillants([])
            return
        }

        // Find the seance and load its assigned surveillants
        const seance = dateSeances.find((s: typeof dateSeances[0]) => s.id === block.seanceId)
        if (seance) {
            const assignedIds = seance.enseignants?.map((e: typeof seance.enseignants[0]) => e.id) || []
            setAssignedSurveillants(assignedIds)

            // Also load the matiere
            if (seance.matieres?.[0]) {
                setSelectedMatiereId(String(seance.matieres[0].id))
            }
        }
    }, [selectedBlockId, isAdmin, timeBlocks, dateSeances])

    // ADMIN: Delete block
    const handleDeleteBlock = async (blockId: number | 'new') => {
        if (!isAdmin) return

        if (blockId === 'new') {
            setTimeBlocks(prev => prev.filter(b => b.id !== blockId))
            if (selectedBlockId === blockId) {
                setSelectedBlockId(null)
                setSelectedMatiereId('')
            }
            return
        }

        try {
            await deleteMutation.mutateAsync(blockId as number)
            setTimeBlocks(prev => prev.filter(b => b.id !== blockId))
            if (selectedBlockId === blockId) {
                setSelectedBlockId(null)
                setSelectedMatiereId('')
            }
            toast({ title: 'Séance supprimée' })
        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: 'Impossible de supprimer la séance',
                variant: 'destructive'
            })
        }
    }

    // ENSEIGNANT: Handle checkbox selection
    const handleSelectSeance = (seanceId: number) => {
        if (!isSurveillant) return
        setSelectedSeanceId(prev => prev === seanceId ? null : seanceId)
    }

    // Get selected block or seance
    const selectedBlock = isAdmin ? timeBlocks.find(b => b.id === selectedBlockId) : null
    const selectedSeance = isSurveillant ? dateSeances.find((s: typeof dateSeances[0]) => s.id === selectedSeanceId) : null

    // Calculate block position and width
    const getBlockStyle = (hDebut: number, hFin: number) => {
        const startPercent = ((hDebut - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100
        const widthPercent = ((hFin - hDebut) / (MAX_HOUR - MIN_HOUR)) * 100

        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`
        }
    }

    // ADMIN: Submit seance creation/edit
    const handleAdminSubmit = async () => {
        if (!isAdmin || !selectedBlock) return

        const validationErrors: string[] = []

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

        if (validationErrors.length > 0) {
            setErrors(validationErrors)
            return
        }

        setErrors([])
        setIsSubmitting(true)

        try {
            const matiere = matieres.find((m: typeof matieres[0]) => m.id === parseInt(selectedMatiereId))
            if (!matiere) throw new Error('Matière non trouvée')

            const { hDebut, hFin } = selectedBlock

            // Create/ensure horaire exists
            try {
                await horaireApi.get(hDebut, hFin)
            } catch {
                await horaireApi.add({ hDebut, hFin })
            }

            // Create or update seance
            const payload: SeanceDTO = {
                jour: annee,
                mois,
                annee: jour,
                horaireHDebut: hDebut,
                horaireHFin: hFin
            }

            if (selectedBlock.isNew) {
                const response = await seanceApi.add(payload)
                const seanceId = response.data.id

                const matierePayload: MatiereDTO = {
                    nom: matiere.nom,
                    nbPaquets: matiere.nbPaquets,
                    seanceId
                }
                await matiereApi.edit(matiere.id, matierePayload)

                // Assign surveillants
                for (const enseignantId of assignedSurveillants) {
                    try {
                        await seanceApi.soumettreVoeu(enseignantId, seanceId)
                    } catch (error) {
                        console.error(`Failed to assign surveillant ${enseignantId}:`, error)
                    }
                }

                if (assignedSurveillants.length > 0) {
                    await enseignantApi.recalcCharges()
                }

                toast({ title: 'Séance créée avec succès' })
            } else {
                await seanceApi.edit(selectedBlock.seanceId!, payload)

                const matierePayload: MatiereDTO = {
                    nom: matiere.nom,
                    nbPaquets: matiere.nbPaquets,
                    seanceId: selectedBlock.seanceId!
                }
                await matiereApi.edit(matiere.id, matierePayload)

                // Assign surveillants
                for (const enseignantId of assignedSurveillants) {
                    try {
                        await seanceApi.soumettreVoeu(enseignantId, selectedBlock.seanceId!)
                    } catch (error) {
                        console.error(`Failed to assign surveillant ${enseignantId}:`, error)
                    }
                }

                if (assignedSurveillants.length > 0) {
                    await enseignantApi.recalcCharges()
                }

                toast({ title: 'Séance modifiée avec succès' })
            }

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['horaires'] })
            queryClient.invalidateQueries({ queryKey: ['matieres'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            navigate('/dashboard')

        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: error.message || 'Une erreur est survenue',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ENSEIGNANT: Submit voeu
    const handleEnseignantSubmit = async () => {
        if (!isSurveillant || !selectedSeanceId || !userId) return

        setIsSubmitting(true)

        try {
            await seanceApi.soumettreVoeu(userId, selectedSeanceId)
            await enseignantApi.recalcCharges()

            toast({
                title: 'Vœu soumis avec succès!',
                description: 'Vous avez été assigné à cette séance.'
            })

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            navigate('/dashboard')

        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: error.response?.data?.message || 'Une erreur est survenue',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // READ-ONLY MODE (PAS_SURVEILLANT)
    if (isReadOnly) {
        return (
            <div className="container mx-auto p-4 max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Séances du jour</h1>
                        <p className="text-slate-600 capitalize">{formattedDate}</p>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                        <Info className="w-4 h-4 mr-1" />
                        Accès en lecture seule
                    </Badge>
                </div>

                {/* Alert */}
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Vous n'avez pas les droits pour cette action.</AlertTitle>
                    <AlertDescription>
                        Contactez un administrateur pour devenir surveillant et pouvoir vous assigner aux séances.
                    </AlertDescription>
                </Alert>

                {/* Read-only timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle>Séances disponibles</CardTitle>
                        <p className="text-sm text-slate-500">
                            Vue en lecture seule des séances de la journée
                        </p>
                    </CardHeader>
                    <CardContent>
                        {dateSeances.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="text-lg">Aucune séance disponible pour cette date.</p>
                            </div>
                        ) : (
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

                                {/* Read-only seance blocks */}
                                {dateSeances.map((seance: typeof dateSeances[0]) => {
                                    const hDebut = seance.horaire?.embHoraire?.hdebut ?? MIN_HOUR
                                    const hFin = seance.horaire?.embHoraire?.hfin ?? MIN_HOUR + 2
                                    const matiereName = seance.matieres?.[0]?.nom || 'Matière inconnue'

                                    return (
                                        <div key={seance.id} className="flex items-center">
                                            <div className="w-32 flex-shrink-0 pr-4">
                                                <div className="text-sm font-medium text-slate-700">
                                                    Séance #{seance.id}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">
                                                    {matiereName}
                                                </div>
                                            </div>

                                            <div className="relative flex-1 h-12 bg-slate-100 rounded">
                                                <div
                                                    className="absolute top-1 bottom-1 rounded bg-slate-400"
                                                    style={getBlockStyle(hDebut, hFin)}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                                                        {hDebut}h - {hFin}h
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-16 flex-shrink-0 pl-2 text-xs text-slate-500">
                                                {seance.enseignants?.length ?? 0} surv.
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Back button */}
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        )
    }

    // ADMIN & SURVEILLANT MODES
    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-6">
            {/* Header with permission badge */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {isAdmin ? 'Gérer les séances' : 'Sélectionner une séance'}
                    </h1>
                    <p className="text-slate-600 capitalize">{formattedDate}</p>
                </div>
                <div className="text-right">
                    <Badge variant={isAdmin ? 'default' : 'secondary'} className="mb-1">
                        {isAdmin ? 'Administrateur' : 'Surveillant'}
                    </Badge>
                    <p className="text-xs text-slate-500">
                        {isAdmin
                            ? 'Vous pouvez créer, modifier et supprimer des séances'
                            : 'Vous pouvez vous assigner aux séances existantes'}
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>{isAdmin ? 'Plages horaires' : 'Séances disponibles'}</CardTitle>
                    <p className="text-sm text-slate-500">
                        {isAdmin
                            ? 'Créez ou modifiez les plages horaires en faisant glisser sur la timeline'
                            : 'Sélectionnez une séance pour soumettre votre vœu de surveillance'}
                    </p>
                </CardHeader>
                <CardContent>
                    {!isAdmin && dateSeances.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-lg">Aucune séance disponible pour cette date.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Hour header */}
                            <div className="flex">
                                {!isAdmin && <div className="w-8 flex-shrink-0" />}
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

                            {/* ADMIN MODE */}
                            {isAdmin && (
                                <>
                                    {timeBlocks.filter(b => !b.isNew).map((block) => {
                                        // Get assigned surveillants for this block
                                        const seance = dateSeances.find((s: typeof dateSeances[0]) => s.id === block.seanceId)
                                        const surveillantCount = seance?.enseignants?.length || 0

                                        return (
                                            <div key={block.id} className="flex items-center">
                                                <div className="w-32 flex-shrink-0 pr-4">
                                                    <div className="text-sm font-medium text-slate-700">
                                                        Séance #{block.seanceId}
                                                    </div>
                                                    {surveillantCount > 0 && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Users className="w-3 h-3 text-blue-600" />
                                                            <span className="text-xs text-blue-600 font-medium">
                                                                {surveillantCount}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="relative flex-1 h-12 bg-slate-100 rounded">
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${selectedBlockId === block.id
                                                            ? 'bg-blue-500 ring-2 ring-blue-600'
                                                            : 'bg-blue-400 hover:bg-blue-500'
                                                            }`}
                                                        style={getBlockStyle(block.hDebut, block.hFin)}
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
                                                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}

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
                                                    style={getBlockStyle(block.hDebut, block.hFin)}
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
                                                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ENSEIGNANT MODE */}
                            {isSurveillant && !isAdmin && dateSeances.map((seance: typeof dateSeances[0]) => {
                                const hDebut = seance.horaire?.embHoraire?.hdebut ?? MIN_HOUR
                                const hFin = seance.horaire?.embHoraire?.hfin ?? MIN_HOUR + 2
                                const matiereName = seance.matieres?.[0]?.nom || 'Matière inconnue'
                                const isSelected = selectedSeanceId === seance.id

                                return (
                                    <div key={seance.id} className="flex items-center">
                                        <div className="w-8 flex-shrink-0 flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectSeance(seance.id)}
                                                className="w-4 h-4 cursor-pointer accent-blue-600"
                                                aria-label={`Sélectionner la séance ${seance.id}`}
                                            />
                                        </div>

                                        <div className="w-32 flex-shrink-0 pr-4">
                                            <div className="text-sm font-medium text-slate-700">
                                                Séance #{seance.id}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">
                                                {matiereName}
                                            </div>
                                        </div>

                                        <div className="relative flex-1 h-12 bg-slate-100 rounded">
                                            <div
                                                className={`absolute top-1 bottom-1 rounded transition-all cursor-pointer ${isSelected
                                                    ? 'bg-blue-600 ring-2 ring-blue-700'
                                                    : 'bg-blue-400'
                                                    }`}
                                                style={getBlockStyle(hDebut, hFin)}
                                                onClick={() => handleSelectSeance(seance.id)}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                                                    {hDebut}h - {hFin}h
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-16 flex-shrink-0" />
                                    </div>
                                )
                            })}
                        </div>
                    )
                    }
                </CardContent >
            </Card >

            {/* Form - ADMIN MODE */}
            {
                isAdmin && selectedBlock && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedBlock.isNew ? 'Nouvelle séance' : 'Modifier la séance'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-medium">
                                    Plage horaire: {selectedBlock.hDebut}h00 - {selectedBlock.hFin}h00
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Matière *</label>
                                <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez une matière" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {matieres.map((matiere: typeof matieres[0]) => (
                                            <SelectItem key={matiere.id} value={String(matiere.id)}>
                                                {matiere.nom} ({matiere.nbPaquets} paquets)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Heure de début</label>
                                    <Input
                                        type="number"
                                        value={selectedBlock.hDebut}
                                        onChange={(e: any) => {
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
                                        onChange={(e: any) => {
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

                            {/* Surveillant Assignment */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-600" />
                                    <label className="text-sm font-medium">Assigner des surveillants</label>
                                    <Badge variant="secondary" className="text-xs">
                                        {assignedSurveillants.length} sélectionné{assignedSurveillants.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                {eligibleSurveillants.length === 0 ? (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            {!selectedMatiereId
                                                ? 'Sélectionnez une matière pour voir les surveillants éligibles'
                                                : 'Aucun surveillant éligible pour cette matière'}
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2 bg-slate-50">
                                        {eligibleSurveillants.map((ens: typeof enseignants[0]) => {
                                            const isSelected = assignedSurveillants.includes(ens.id)
                                            const ownsMatiere = selectedMatiereId && matieres.find((m: typeof matieres[0]) =>
                                                m.id === parseInt(selectedMatiereId)
                                            ) && ens.matieres?.some((m: typeof ens.matieres[0]) =>
                                                m.id === parseInt(selectedMatiereId)
                                            )

                                            return (
                                                <label
                                                    key={ens.id}
                                                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${ownsMatiere
                                                        ? 'opacity-50 cursor-not-allowed bg-red-50'
                                                        : isSelected
                                                            ? 'bg-blue-100 hover:bg-blue-200'
                                                            : 'hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={!!ownsMatiere}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setAssignedSurveillants(prev => [...prev, ens.id])
                                                            } else {
                                                                setAssignedSurveillants(prev => prev.filter(id => id !== ens.id))
                                                            }
                                                        }}
                                                        className="w-4 h-4 cursor-pointer accent-blue-600"
                                                        aria-label={`Assigner ${ens.nom} ${ens.prenom}`}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">
                                                            {ens.nom} {ens.prenom}
                                                        </div>
                                                        {ownsMatiere && (
                                                            <div className="text-xs text-red-600">
                                                                ⚠️ Ne peut surveiller sa propre matière
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isSelected && !ownsMatiere && (
                                                        <Badge variant="default" className="text-xs">
                                                            Assigné
                                                        </Badge>
                                                    )}
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {errors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Erreurs de validation</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside space-y-1">
                                            {errors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )
            }

            {/* Form - ENSEIGNANT MODE */}
            {
                isSurveillant && !isAdmin && selectedSeance && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Séance sélectionnée</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Séance</p>
                                    <p className="font-medium">#{selectedSeance.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Matière</p>
                                    <p className="font-medium">{selectedSeance.matieres?.[0]?.nom || 'Non définie'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Horaire</p>
                                    <p className="font-medium">
                                        {selectedSeance.horaire?.embHoraire?.hdebut}h00 - {selectedSeance.horaire?.embHoraire?.hfin}h00
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Date</p>
                                    <p className="font-medium capitalize">{formattedDate}</p>
                                </div>
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>En soumettant ce vœu:</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Vous serez assigné à cette séance de surveillance</li>
                                        <li>Vos charges de surveillance seront recalculées</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )
            }

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Annuler
                </Button>
                <Button
                    onClick={isAdmin ? handleAdminSubmit : handleEnseignantSubmit}
                    disabled={isSubmitting || (isAdmin ? !selectedBlock : !selectedSeanceId)}
                >
                    {isSubmitting
                        ? 'En cours...'
                        : isAdmin
                            ? (selectedBlock?.isNew ? 'Créer la séance' : 'Modifier la séance')
                            : 'Soumettre un vœu'}
                </Button>
            </div>
        </div >
    )
}
