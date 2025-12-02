import { useMutation, useQueryClient } from '@tanstack/react-query'
import { horaireApi, HoraireDTO } from '@/api/horaire'
import { seanceApi, SeanceDTO } from '@/api/seance'
import { enseignantApi } from '@/api/enseignant'
import { matiereApi, MatiereDTO } from '@/api/matiere'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'

type WorkflowPayload = {
    date: Date
    hDebut: number
    hFin: number
    matiereId: number
    matiereName: string
    matiereNbPaquets: number
}

export function useSeanceWorkflow() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { userId } = useAuthStore()

    const createSeanceWithVoeu = useMutation({
        mutationFn: async (payload: WorkflowPayload) => {
            if (!userId) {
                throw new Error('User not authenticated')
            }

            try {
                const { date, hDebut, hFin, matiereId, matiereName, matiereNbPaquets } = payload

                console.log('Starting seance creation workflow...', payload)

                // Step 1: Check if horaire exists, if not create it
                console.log('Step 1: Ensuring horaire exists...')
                let horaireExists = false
                try {
                    await horaireApi.get(hDebut, hFin)
                    horaireExists = true
                    console.log('Horaire already exists')
                } catch {
                    console.log('Horaire not found, creating...')
                    const horairePayload: HoraireDTO = { hDebut, hFin }
                    await horaireApi.add(horairePayload)
                    console.log('Horaire created')
                }

                // Step 2: Create seance
                console.log('Step 2: Creating seance...')
                const seancePayload: SeanceDTO = {
                    jour: date.getDate(),
                    mois: date.getMonth() + 1,
                    annee: date.getFullYear(),
                    horaireHDebut: hDebut,
                    horaireHFin: hFin
                }
                const seanceResponse = await seanceApi.add(seancePayload)
                const seance = seanceResponse.data
                console.log('Seance created:', seance)

                // Step 3: Link matiere to seance
                console.log('Step 3: Linking matiere to seance...')
                const matierePayload: MatiereDTO = {
                    nom: matiereName,
                    nbPaquets: matiereNbPaquets,
                    seanceId: seance.id
                }
                await matiereApi.edit(matiereId, matierePayload)
                console.log('Matiere linked to seance')

                // Step 4: Submit voeu for this seance
                console.log('Step 4: Submitting voeu...')
                await seanceApi.soumettreVoeu(userId, seance.id)
                console.log('Voeu submitted')

                // Step 5: Recalculate charges
                console.log('Step 5: Recalculating charges...')
                await enseignantApi.recalcCharges()
                console.log('Charges recalculated')

                return { seance }
            } catch (error: any) {
                console.error('Workflow failed:', error)
                throw new Error(error.response?.data?.message || error.message || 'Une erreur est survenue')
            }
        },
        onSuccess: () => {
            toast({
                title: 'Séance créée et vœu soumis avec succès!',
                description: 'La matière a été liée et les charges ont été recalculées.'
            })
            // Invalidate queries to refresh calendar
            queryClient.invalidateQueries({ queryKey: ['seances'] })
            queryClient.invalidateQueries({ queryKey: ['horaires'] })
            queryClient.invalidateQueries({ queryKey: ['matieres'] })
            queryClient.invalidateQueries({ queryKey: ['enseignants'] })
        },
        onError: (error: Error) => {
            toast({
                title: 'Erreur lors de la création',
                description: error.message,
                variant: 'destructive'
            })
        }
    })

    return {
        createSeanceWithVoeu
    }
}
