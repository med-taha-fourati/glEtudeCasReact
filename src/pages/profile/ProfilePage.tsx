import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { enseignantApi, type Enseignant } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'

export function ProfilePage() {
  const { token } = useAuthStore()

  const { data, isLoading, isError } = useQuery<Enseignant>({
    queryKey: ['profile'],
    queryFn: () => enseignantApi.profile(token!).then((res) => res.data),
    enabled: !!token
  })

  if (isLoading) {
    return <div>Chargement du profil...</div>
  }

  if (isError || !data) {
    return <div>Erreur lors du chargement du profil.</div>
  }

  const profile = data

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nom</label>
              <Input value={profile.nom ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Prénom</label>
              <Input value={profile.prenom ?? ''} disabled />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nom d'utilisateur</label>
            <Input value={profile.username ?? ''} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Téléphone</label>
            <Input value={profile.tel ?? ''} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Grade</label>
              <Input value={profile.grade?.grade ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Charge de surveillance</label>
              <Input value={profile.grade?.chargeSurveillance ?? ''} disabled />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Ancienneté</label>
            <Input value={profile.anciennete ?? 0} disabled />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">État surveillant</label>
            <Badge variant={profile.etatSurveillant === 'SURVEILLANT' ? 'default' : 'secondary'}>
              {profile.etatSurveillant === 'SURVEILLANT' ? 'Surveillant' : 'Pas surveillant'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {profile.matieres && profile.matieres.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matières enseignées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.matieres.map((matiere) => (
                <Badge key={matiere.id} variant="outline">
                  {matiere.nom} ({matiere.nbPaquets} paquets)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {profile.seances && profile.seances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Séances de surveillance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.seances.map((seance) => (
                <div key={seance.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">
                      {new Date(seance.seanceDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-slate-500">
                      {seance.horaire?.embHoraire
                        ? `${seance.horaire.embHoraire.hDebut}h - ${seance.horaire.embHoraire.hFin}h`
                        : 'Horaire non défini'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {seance.verrouillee && <Badge variant="outline">Verrouillée</Badge>}
                    {seance.passeeExamen && <Badge variant="default">Terminée</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
