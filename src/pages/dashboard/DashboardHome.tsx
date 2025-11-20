import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeances } from '@/hooks/useSeances'
import { useEnseignants } from '@/hooks/useEnseignants'
import { useMatieres } from '@/hooks/useMatieres'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid/index.js'
import '@fullcalendar/core/index.js'

export function DashboardHome() {
  const navigate = useNavigate()
  const { data: seances = [], isLoading: seancesLoading, isSaturee } = useSeances()
  const { data: enseignants = [], isLoading: enseignantsLoading } = useEnseignants()
  const { data: matieres = [], isLoading: matieresLoading } = useMatieres()

  const totalSeances = seances.length
  const seancesSaturees = seances.filter((s) => isSaturee(s)).length
  const totalSurveillants = seances.reduce((acc, s) => acc + s.currentSurveillants, 0)
  const events = seances.map((s: any) => {
    const matieresSeance = (s.matieres ?? s.Matieres ?? []) as any[]
    const matiereNames = matieresSeance
      .map((m) => m.nom ?? m.Nom)
      .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)

    const title =
      matiereNames.length > 0
        ? matiereNames.join(', ')
        : `Séance #${s.id}${s.salle ? ` - ${s.salle}` : ''}`

    // Backend can expose either dateDebut/dateFin or a single seanceDate
    const start = s.dateDebut ?? s.seanceDate ?? null
    const end = s.dateFin ?? null

    return {
      id: String(s.id),
      title,
      start,
      end: end || undefined
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-slate-500">
            Vision globale sur les séances, enseignants et matières.
          </p>
        </div>
        <Button onClick={() => navigate('/seances')}>Voir les séances</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Séances programmées</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {seancesLoading ? '...' : totalSeances}
            </p>
            <p className="text-xs text-slate-500">{seancesSaturees} séances saturées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enseignants actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {enseignantsLoading ? '...' : enseignants.length}
            </p>
            <p className="text-xs text-slate-500">
              {totalSurveillants} surveillants assignés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matières suivies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {matieresLoading ? '...' : matieres.length}
            </p>
            <p className="text-xs text-slate-500">Nombre total de matières dans le système</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendrier des séances</CardTitle>
        </CardHeader>
        <CardContent>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
          />
        </CardContent>
      </Card>
    </div>
  )
}
