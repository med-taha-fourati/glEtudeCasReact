import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeances } from '@/hooks/useSeances'
import { useEnseignants } from '@/hooks/useEnseignants'
import { useMatieres } from '@/hooks/useMatieres'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid/index.js'
import interactionPlugin from '@fullcalendar/interaction'
import '@fullcalendar/core/index.js'
import { Seance } from 'api/enseignant'

export function DashboardHome() {
  const navigate = useNavigate()
  const { data: seances = [], isLoading: seancesLoading } = useSeances()
  const { data: enseignants = [], isLoading: enseignantsLoading } = useEnseignants()
  const { data: matieres = [], isLoading: matieresLoading } = useMatieres()

  const totalSeances = seances.length

  // Generate vibrant, distinct colors for each seance
  const getSeanceColor = (id: number) => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
      '#6366F1', // indigo
      '#84CC16', // lime
    ]
    return colors[id % colors.length]
  }

  const events = seances.map((s) => {
    const color = getSeanceColor(s.id)

    // Parse the seanceDate (format: YYYY-MM-DD)
    const dateStr = s.seanceDate

    // Get time from horaire if available
    const hDebut = s.horaire?.embHoraire?.hDebut ?? 8
    const hFin = s.horaire?.embHoraire?.hFin ?? 10

    const startStr = `${dateStr}T${String(hDebut).padStart(2, '0')}:00:00`
    const endStr = `${dateStr}T${String(hFin).padStart(2, '0')}:00:00`

    // Get matiere names
    const matiereNames = s.matieres?.map((m: { nom: string }) => m.nom).join(', ') || 'Aucune matière'
    const nbSurveillants = s.enseignants?.length ?? 0

    return {
      id: String(s.id),
      title: `Séance #${s.id}`,
      start: startStr,
      end: endStr,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        details: `${hDebut}h - ${hFin}h`,
        matieres: matiereNames,
        surveillants: `${nbSurveillants} surveillant(s)`,
        verrouillee: s.verrouillee,
        passeeExamen: s.passeeExamen
      }
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
        {/* <Button onClick={() => navigate('/seances')}>Voir les séances</Button> */}
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
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
            selectable={true}
            selectMirror={false}
            dateClick={(info) => {
              // Navigate to timeline page
              navigate(`/create-seance/${info.dateStr}`)
            }}
            eventContent={(eventInfo) => (
              <div className="w-full h-full p-1 text-white overflow-hidden rounded">
                <div className="font-semibold text-xs truncate">
                  {eventInfo.event.title}
                  {eventInfo.event.extendedProps.verrouillee && ' 🔒'}
                  {eventInfo.event.extendedProps.passeeExamen && ' ✓'}
                </div>
                <div className="text-[10px] opacity-90 truncate">{eventInfo.event.extendedProps.details}</div>
                <div className="text-[10px] opacity-80 truncate">{eventInfo.event.extendedProps.matieres}</div>
                <div className="text-[10px] opacity-80">{eventInfo.event.extendedProps.surveillants}</div>
              </div>
            )}
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
