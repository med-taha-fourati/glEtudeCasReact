import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { enseignantApi } from '@/api/enseignant'

type EnseignantProfile = {
  username?: string
  password?: string
  nom?: string
  prenom?: string
  tel?: number
  gradeId?: number
  matiere?: number[]
  etatSurveillant?: unknown
  grade?: {
    libelle?: string
    chargeSurveillance?: number
  }
}

type ResultDto<T> = {
  isSuccess: boolean
  data: T | null
  errorMessage?: string | null
  statusCode?: number | null
}

export function ProfilePage() {
  const { data, isLoading } = useQuery<ResultDto<EnseignantProfile>>({
    queryKey: ['profile'],
    queryFn: () => enseignantApi.profile().then((res) => res.data as ResultDto<EnseignantProfile>)
  })

  if (isLoading) {
    return <div>Chargement du profil...</div>
  }

  const profile: EnseignantProfile = data?.data ?? {}

  return (
    <div className="max-w-xl space-y-4">
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
            <label className="text-sm font-medium">Téléphone</label>
            <Input value={profile.tel ?? ''} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Grade</label>
              <Input value={profile.grade?.libelle ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Charge de surveillance</label>
              <Input value={profile.grade?.chargeSurveillance ?? ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
