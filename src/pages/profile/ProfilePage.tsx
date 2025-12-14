import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { enseignantApi, type Enseignant } from '@/api/enseignant'
import { seanceApi, type Seance } from '@/api/seance'
import { useAuthStore } from '@/store/auth'
import { Matiere } from 'api/enseignant'
import { useToast } from '@/components/ui/use-toast'
import { Trash2 } from 'lucide-react'

export function ProfilePage() {
  const { token, userId } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<Enseignant>({
    queryKey: ['profile'],
    queryFn: () => enseignantApi.profile(token!).then((res) => res.data),
    enabled: !!token
  })

  const { data: seancesDetails, isLoading: isLoadingSeances } = useQuery<Seance[]>({
    queryKey: ['seances-details', data?.seances],
    queryFn: async () => {
      if (!data?.seances || data.seances.length === 0) return []
      const seancePromises = data.seances.map(s => { 
        const e =  seanceApi.fetch(s.id).then(res => res.data);
        console.log('Fetched seance:', e);
        return e;
    })
      return Promise.all(seancePromises)
    },
    enabled: !!data?.seances && data.seances.length > 0
  })

  const retirerVoeuMutation = useMutation({
    mutationFn: ({ enseignantId, seanceId }: { enseignantId: number; seanceId: number }) =>
      seanceApi.retirerVoeu(enseignantId, seanceId),
    onSuccess: () => {
      toast({
        title: 'Vœu retiré',
        description: 'Vous avez été désassigné de cette séance avec succès.'
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['seances-details'] })
      queryClient.invalidateQueries({ queryKey: ['seances'] })
      queryClient.invalidateQueries({ queryKey: ['enseignants'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer le vœu',
        variant: 'destructive'
      })
    }
  })

  const handleRetirerVoeu = (seanceId: number) => {
    if (!userId) return
    retirerVoeuMutation.mutate({ enseignantId: userId, seanceId })
  }

  if (isLoading) {
    return <div>Chargement du profil...</div>
  }

  if (isError || !data) {
    return <div>Erreur lors du chargement du profil.</div>
  }

  const profile = data

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Séances de surveillance</CardTitle>
            </CardHeader>
            {isLoadingSeances ? (
              <CardContent>Chargement des séances...</CardContent>
            ) : seancesDetails && seancesDetails.length > 0 ? (
              <CardContent>
                <div className="space-y-2">
                  {seancesDetails.map((seance) => (
                    
                    <div key={seance.id} className="border rounded-lg p-3 space-y-2">
                      
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-lg">
                            Séance #{seance.id}
                          </div>
                          <div className="text-sm text-slate-600">
                            {new Date(seance.seanceDate).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {seance.horaire?.embHoraire
                              ? `${seance.horaire.embHoraire.hdebut}h - ${seance.horaire.embHoraire.hfin}h`
                              : 'Horaire non défini'}
                          </div>
                          {seance.matieres && seance.matieres.length > 0 && (
                            <div className="text-sm text-slate-500 mt-1">
                              Matière: {seance.matieres.map(m => m.nom).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex gap-2">
                            {seance.verrouillee && <Badge variant="outline">Verrouillée</Badge>}
                            {seance.passeeExamen && <Badge variant="default">Terminée</Badge>}
                          </div>
                          {!seance.verrouillee && !seance.passeeExamen && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRetirerVoeu(seance.id)}
                              disabled={retirerVoeuMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Retirer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent>Aucune séance de surveillance assignée.</CardContent>
            )}
          </Card>

        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nom</label>
                  <Input value={profile.nom ?? ''} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prénom</label>
                  <Input value={profile.prenom ?? ''} readOnly />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nom d'utilisateur</label>
                <Input value={profile.username ?? ''} readOnly />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Téléphone</label>
                <Input value={profile.tel ?? ''} readOnly />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Grade</label>
                  <Input value={profile.grade?.grade ?? ''} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Charge de surveillance</label>
                  <Input value={profile.grade?.chargeSurveillance ?? ''} readOnly />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">État surveillant</label>
                <Badge variant={profile.etatSurveillant === 'SURVEILLANT' ? 'default' : 'secondary'}>
                  {profile.etatSurveillant === 'SURVEILLANT' ? 'Surveillant' : 'Pas surveillant'}
                </Badge>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Mes Matières</CardTitle>
            </CardHeader>
            {profile.matieres && profile.matieres.length > 0 ? (
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.matieres.map((matiere: Matiere) => (
                    <Badge key={matiere.id} variant="outline">
                      {matiere.nom} ({matiere.nbPaquets} paquets)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent>Aucune matière assignée.</CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}