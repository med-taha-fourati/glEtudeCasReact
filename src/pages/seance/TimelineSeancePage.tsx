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
import { AlertCircle, Info, Users, Check, ChevronsUpDown } from 'lucide-react'
import type { AppError } from '@/utils/errorHandling'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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


    const dateObj = date ? new Date(date) : new Date()
    const [jour, mois, annee] = date ? date.split('-').map(Number) : [dateObj.getDate(), dateObj.getMonth() + 1, dateObj.getFullYear()]

    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })


    const dateSeances = allSeances.filter((s: typeof allSeances[0]) => s.seanceDate === date)


    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
    const [selectedBlockId, setSelectedBlockId] = useState<number | 'new' | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragType, setDragType] = useState<'create' | 'resize-start' | 'resize-end' | null>(null)
    const [dragBlockId, setDragBlockId] = useState<number | 'new' | null>(null)


    const [selectedSeanceIds, setSelectedSeanceIds] = useState<number[]>([])


    const [selectedMatiereId, setSelectedMatiereId] = useState<string>('')
    const [isCreatingNewMatiere, setIsCreatingNewMatiere] = useState(false)
    const [newMatiereName, setNewMatiereName] = useState('')
    const [newMatiereNbPaquets, setNewMatiereNbPaquets] = useState<number>(1)
    const [matierePopoverOpen, setMatierePopoverOpen] = useState(false)
    const [assignedSurveillants, setAssignedSurveillants] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    // Cascade delete state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [seanceToDelete, setSeanceToDelete] = useState<number | null>(null)
    const [linkedData, setLinkedData] = useState<{ type: string; count: number }[]>([])
    const [isDeleting, setIsDeleting] = useState(false)


    const eligibleSurveillants = useMemo(() => {
        if (!isAdmin) return []

        const surveillants = enseignants.filter((e: typeof enseignants[0]) =>
            e.etatSurveillant === 'SURVEILLANT'
        )

        if (!selectedMatiereId) return surveillants

        const selectedMatiere = matieres.find((m: typeof matieres[0]) => m.id === parseInt(selectedMatiereId))
        if (!selectedMatiere) return surveillants


        return surveillants.filter((e: typeof enseignants[0]) =>
            !e.matieres?.some((m: typeof e.matieres[0]) => m.id === selectedMatiere.id)
        )
    }, [isAdmin, enseignants, selectedMatiereId, matieres])


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


    const pixelToHour = (pixelX: number): number => {
        if (!timelineRef.current) return MIN_HOUR

        const rect = timelineRef.current.getBoundingClientRect()
        const relativeX = Math.max(0, Math.min(pixelX - rect.left, rect.width))

        const hourRange = MAX_HOUR - MIN_HOUR
        const rawHour = MIN_HOUR + (relativeX / rect.width) * hourRange

        return Math.max(MIN_HOUR, Math.min(MAX_HOUR, Math.round(rawHour)))
    }


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


    const handleBlockEdgeMouseDown = (e: React.MouseEvent, blockId: number | 'new', edge: 'start' | 'end') => {
        if (!isAdmin) return

        e.stopPropagation()
        setDragBlockId(blockId)
        setDragType(edge === 'start' ? 'resize-start' : 'resize-end')
        setIsDragging(true)
    }


    const handleBlockClick = (blockId: number | 'new') => {
        if (!isAdmin) return
        setSelectedBlockId(blockId)
    }


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


    const handleMouseUp = () => {
        if (!isAdmin) return

        setIsDragging(false)
        setDragType(null)
        setDragBlockId(null)
    }


    const loadedBlockIdRef = useRef<number | 'new' | null>(null)


    useEffect(() => {

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

        const seanceId = block.seanceId

        // Check each enseignant to see if they have this seance in their list
        const assignedIds: number[] = []
        enseignants.forEach((enseignant: any) => {
            // Check if this enseignant has the seance in their seances list
            const hasSeance = enseignant.seances?.some((s: any) => s.id === seanceId)
            if (hasSeance) {
                assignedIds.push(enseignant.id)
            }
        })

        setAssignedSurveillants(assignedIds)

        // Load matiere if available
        const seance = dateSeances.find((s: typeof dateSeances[0]) => s.id === seanceId)
        if (seance?.matieres?.[0]) {
            setSelectedMatiereId(String(seance.matieres[0].id))
        }
    }, [selectedBlockId, isAdmin, timeBlocks, dateSeances, enseignants])


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

        const seanceId = blockId as number

        // Check for linked records
        const linkedMatieres = matieres.filter((m: any) => m.seance?.id === seanceId)
        const linkedEnseignants = enseignants.filter((e: any) =>
            e.seances?.some((s: any) => s.id === seanceId)
        )

        // If has linked records, show confirmation dialog
        if (linkedMatieres.length > 0 || linkedEnseignants.length > 0) {
            const items = []
            if (linkedMatieres.length > 0) {
                items.push({ type: 'matière(s)', count: linkedMatieres.length })
            }
            if (linkedEnseignants.length > 0) {
                items.push({ type: 'enseignant(s) assigné(s)', count: linkedEnseignants.length })
            }

            setLinkedData(items)
            setSeanceToDelete(seanceId)
            setDeleteConfirmOpen(true)
        } else {
            // No linked records, safe to delete directly
            try {
                await deleteMutation.mutateAsync(seanceId)
                setTimeBlocks(prev => prev.filter(b => b.id !== blockId))
                if (selectedBlockId === blockId) {
                    setSelectedBlockId(null)
                    setSelectedMatiereId('')
                }
                toast({ title: 'Séance supprimée' })
            } catch (err) {
                const error = err as AppError
                toast({
                    title: 'Erreur',
                    description: error.message,
                    variant: 'destructive'
                })
            }
        }
    }

    // Perform cascade delete after confirmation
    const handleConfirmCascadeDelete = async () => {
        if (!seanceToDelete) return

        setIsDeleting(true)

        try {
            // Step 1: Remove all enseignant assignments
            const linkedEnseignants = enseignants.filter((e: any) =>
                e.seances?.some((s: any) => s.id === seanceToDelete)
            )

            for (const enseignant of linkedEnseignants) {
                try {
                    await seanceApi.retirerVoeu(enseignant.id, seanceToDelete)
                } catch (error) {
                    console.error(`Failed to remove enseignant ${enseignant.id}:`, error)
                }
            }

            // Step 2: Delete matières linked to this séance
            const linkedMatieres = matieres.filter((m: any) => m.seance?.id === seanceToDelete)

            for (const matiere of linkedMatieres) {
                try {
                    await matiereApi.delete(matiere.id)
                } catch (error) {
                    console.error(`Failed to delete matiere ${matiere.id}:`, error)
                }
            }

            // Step 3: Now safe to delete the séance
            await deleteMutation.mutateAsync(seanceToDelete)
            setTimeBlocks(prev => prev.filter(b => b.id !== seanceToDelete))
            if (selectedBlockId === seanceToDelete) {
                setSelectedBlockId(null)
                setSelectedMatiereId('')
            }

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['matieres'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            toast({
                title: 'Suppression réussie',
                description: `Séance et ${linkedMatieres.length + linkedEnseignants.length} élément(s) lié(s) supprimés`
            })
        } catch (err) {
            const error = err as AppError
            toast({
                title: 'Erreur lors de la suppression',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsDeleting(false)
            setDeleteConfirmOpen(false)
            setSeanceToDelete(null)
            setLinkedData([])
        }
    }


    const handleSelectSeance = (seanceId: number) => {
        if (!isSurveillant) return
        setSelectedSeanceIds(prev => 
            prev.includes(seanceId) 
                ? prev.filter(id => id !== seanceId)
                : [...prev, seanceId]
        )
    }


    const selectedBlock = isAdmin ? timeBlocks.find(b => b.id === selectedBlockId) : null
    const selectedSeances = isSurveillant ? dateSeances.filter((s: typeof dateSeances[0]) => selectedSeanceIds.includes(s.id)) : []


    const getBlockStyle = (hDebut: number, hFin: number) => {
        const startPercent = ((hDebut - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * 100
        const widthPercent = ((hFin - hDebut) / (MAX_HOUR - MIN_HOUR)) * 100

        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`
        }
    }


    const handleAdminSubmit = async () => {
        if (!isAdmin || !selectedBlock) return

        const validationErrors: string[] = []


        if (isCreatingNewMatiere) {
            if (!newMatiereName.trim()) {
                validationErrors.push('Veuillez saisir le nom de la matière')
            }
            if (newMatiereNbPaquets < 1) {
                validationErrors.push('Le nombre de paquets doit être au moins 1')
            }
        } else {
            if (!selectedMatiereId) {
                validationErrors.push('Veuillez sélectionner une matière')
            }
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

            let matiere = null
            if (!isCreatingNewMatiere) {
                matiere = matieres.find((m: typeof matieres[0]) => m.id === parseInt(selectedMatiereId))
                if (!matiere) throw new Error('Matière non trouvée')
            }

            const { hDebut, hFin } = selectedBlock


            try {
                await horaireApi.get(hDebut, hFin)
            } catch {
                await horaireApi.add({ hDebut, hFin })
            }


            const payload: SeanceDTO = {
                jour: annee,
                mois,
                annee: jour,
                horaireHDebut: hDebut,
                horaireHFin: hFin
            }

            if (selectedBlock.isNew) {
                // CREATE MODE
                const response = await seanceApi.add(payload)
                const seanceId = response.data.id

                // Create new matiere or link existing one
                if (isCreatingNewMatiere) {
                    const newMatierePayload: MatiereDTO = {
                        nom: newMatiereName.trim(),
                        nbPaquets: newMatiereNbPaquets,
                        seanceId
                    }
                    await matiereApi.add(newMatierePayload)
                } else {
                    if (matiere) {
                        const matierePayload: MatiereDTO = {
                            nom: matiere.nom,
                            nbPaquets: matiere.nbPaquets,
                            seanceId
                        }
                        await matiereApi.edit(matiere.id, matierePayload)
                    }
                }

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
                // EDIT MODE
                await seanceApi.edit(selectedBlock.seanceId!, payload)

                // Update matiere if using existing one
                if (!isCreatingNewMatiere && matiere) {
                    const matierePayload: MatiereDTO = {
                        nom: matiere.nom,
                        nbPaquets: matiere.nbPaquets,
                        seanceId: selectedBlock.seanceId!
                    }
                    await matiereApi.edit(matiere.id, matierePayload)
                }

                // Get currently assigned enseignants (those who have this seance)
                const currentlyAssigned: number[] = []
                enseignants.forEach((ens: any) => {
                    if (ens.seances?.some((s: any) => s.id === selectedBlock.seanceId)) {
                        currentlyAssigned.push(ens.id)
                    }
                })

                // Find who to add and who to remove
                const toAdd = assignedSurveillants.filter(id => !currentlyAssigned.includes(id))
                const toRemove = currentlyAssigned.filter(id => !assignedSurveillants.includes(id))

                // Add new assignments
                for (const enseignantId of toAdd) {
                    try {
                        await seanceApi.soumettreVoeu(enseignantId, selectedBlock.seanceId!)
                    } catch (error) {
                        console.error(`Failed to assign surveillant ${enseignantId}:`, error)
                    }
                }

                // Remove unchecked assignments
                for (const enseignantId of toRemove) {
                    try {
                        await seanceApi.retirerVoeu(enseignantId, selectedBlock.seanceId!)
                    } catch (error) {
                        console.error(`Failed to remove surveillant ${enseignantId}:`, error)
                    }
                }

                if (toAdd.length > 0 || toRemove.length > 0) {
                    await enseignantApi.recalcCharges()
                }

                toast({ title: 'Séance modifiée avec succès' })
            }

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['horaires'] })
            queryClient.invalidateQueries({ queryKey: ['matieres'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            navigate('/dashboard')

        } catch (err) {
            const error = err as AppError
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }


    const handleEnseignantSubmit = async () => {
        if (!isSurveillant || selectedSeanceIds.length === 0 || !userId) return

        setIsSubmitting(true)

        try {
            // Submit voeu for each selected seance
            for (const seanceId of selectedSeanceIds) {
                await seanceApi.soumettreVoeu(userId, seanceId)
            }
            
            await enseignantApi.recalcCharges()

            toast({
                title: 'Vœux soumis avec succès!',
                description: `Vous avez été assigné à ${selectedSeanceIds.length} séance${selectedSeanceIds.length > 1 ? 's' : ''}.`
            })

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            navigate('/dashboard')

        } catch (err) {
            const error = err as AppError
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }


    const handleEnseignantRetirer = async () => {
        if (!isSurveillant || selectedSeanceIds.length === 0 || !userId) return

        setIsSubmitting(true)

        try {
            // Retirer voeu for each selected seance
            for (const seanceId of selectedSeanceIds) {
                await seanceApi.retirerVoeu(userId, seanceId)
            }
            
            await enseignantApi.recalcCharges()

            toast({
                title: 'Vœux retirés avec succès!',
                description: `Vous avez été désassigné de ${selectedSeanceIds.length} séance${selectedSeanceIds.length > 1 ? 's' : ''}.`
            })

            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })

            navigate('/dashboard')

        } catch (err) {
            const error = err as AppError
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }


    const hasVoeuForSelectedSeances = () => {
        if (!isSurveillant || selectedSeanceIds.length === 0 || !userId) return false

        const currentEnseignant = enseignants.find((e: any) => e.id === userId)
        if (!currentEnseignant) return false

        // Check if ALL selected seances already have voeux
        return selectedSeanceIds.every(seanceId => 
            currentEnseignant.seances?.some((s: any) => s.id === seanceId)
        )
    }


    if (isReadOnly) {
        return (
            <div className="container mx-auto p-4 max-w-6xl space-y-6">

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


                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Vous n'avez pas les droits pour cette action.</AlertTitle>
                    <AlertDescription>
                        Contactez un administrateur pour devenir surveillant et pouvoir vous assigner aux séances.
                    </AlertDescription>
                </Alert>


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


                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        )
    }


    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-6">

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


                            {isAdmin && (
                                <>
                                    {timeBlocks.filter(b => !b.isNew).map((block) => {

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


                            {isSurveillant && !isAdmin && dateSeances.map((seance: typeof dateSeances[0]) => {
                                const hDebut = seance.horaire?.embHoraire?.hdebut ?? MIN_HOUR
                                const hFin = seance.horaire?.embHoraire?.hfin ?? MIN_HOUR + 2
                                const matiereName = seance.matieres?.[0]?.nom || 'Matière inconnue'
                                const isSelected = selectedSeanceIds.includes(seance.id)

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


            {
                isAdmin && selectedBlock && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    {selectedBlock.isNew ? 'Nouvelle séance' : 'Modifier la séance'}
                                </CardTitle>
                                {!selectedBlock.isNew && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Switch to create mode - add new block to timeline
                                            const newBlock: TimeBlock = {
                                                id: 'new',
                                                isNew: true,
                                                hDebut: 8,
                                                hFin: 10,
                                                seanceId: undefined
                                            }
                                            setTimeBlocks(prev => [...prev, newBlock])
                                            setSelectedBlockId('new')
                                            setSelectedMatiereId('')
                                            setAssignedSurveillants([])
                                            setIsCreatingNewMatiere(false)
                                            setNewMatiereName('')
                                            setNewMatiereNbPaquets(1)
                                        }}
                                    >
                                        + Créer nouvelle séance
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-medium">
                                    Plage horaire: {selectedBlock.hDebut}h00 - {selectedBlock.hFin}h00
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Matière *</label>
                                    {selectedBlock.isNew && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsCreatingNewMatiere(!isCreatingNewMatiere)
                                                if (!isCreatingNewMatiere) {
                                                    setSelectedMatiereId('')
                                                }
                                            }}
                                        >
                                            {isCreatingNewMatiere ? 'Choisir existante' : 'Créer nouvelle'}
                                        </Button>
                                    )}
                                </div>

                                {isCreatingNewMatiere ? (
                                    <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Nom de la matière</label>
                                            <Input
                                                value={newMatiereName}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMatiereName(e.target.value)}
                                                placeholder="Ex: Mathématiques"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Nombre de paquets</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newMatiereNbPaquets}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMatiereNbPaquets(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    </div>
                                ) : (
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
                                )}
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


            {
                isSurveillant && !isAdmin && selectedSeances.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedSeances.length} séance{selectedSeances.length > 1 ? 's' : ''} sélectionnée{selectedSeances.length > 1 ? 's' : ''}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {selectedSeances.map((seance: typeof selectedSeances[0]) => (
                                    <div key={seance.id} className="p-3 bg-slate-50 rounded-lg border">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">Séance</p>
                                                <p className="font-medium">#{seance.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Matière</p>
                                                <p className="font-medium text-sm">{seance.matieres?.[0]?.nom || 'Non définie'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Horaire</p>
                                                <p className="font-medium text-sm">
                                                    {seance.horaire?.embHoraire?.hdebut}h - {seance.horaire?.embHoraire?.hfin}h
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>En soumettant {selectedSeances.length > 1 ? 'ces vœux' : 'ce vœu'}:</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Vous serez assigné à {selectedSeances.length > 1 ? 'ces séances' : 'cette séance'} de surveillance</li>
                                        <li>Vos charges de surveillance seront recalculées</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )
            }


            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Annuler
                </Button>
                {isAdmin ? (
                    <Button
                        onClick={handleAdminSubmit}
                        disabled={isSubmitting || !selectedBlock}
                    >
                        {isSubmitting
                            ? 'En cours...'
                            : (selectedBlock?.isNew ? 'Créer la séance' : 'Modifier la séance')}
                    </Button>
                ) : (
                    <>
                        {hasVoeuForSelectedSeances() ? (
                            <Button
                                variant="destructive"
                                onClick={handleEnseignantRetirer}
                                disabled={isSubmitting || selectedSeanceIds.length === 0}
                            >
                                {isSubmitting ? 'En cours...' : `Retirer ${selectedSeanceIds.length > 1 ? 'mes vœux' : 'mon vœu'} (${selectedSeanceIds.length})`}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleEnseignantSubmit}
                                disabled={isSubmitting || selectedSeanceIds.length === 0}
                            >
                                {isSubmitting ? 'En cours...' : `Soumettre ${selectedSeanceIds.length > 1 ? 'mes vœux' : 'un vœu'} (${selectedSeanceIds.length})`}
                            </Button>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmCascadeDelete}
                title="Supprimer la séance?"
                description="Cette séance a des éléments liés qui seront également supprimés."
                linkedItems={linkedData}
                isLoading={isDeleting}
            />
        </div >
    )
}