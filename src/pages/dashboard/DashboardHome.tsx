import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeances } from '@/hooks/useSeances'
import { useEnseignants } from '@/hooks/useEnseignants'
import { useMatieres } from '@/hooks/useMatieres'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid/index.js'
import interactionPlugin from '@fullcalendar/interaction'
import '@fullcalendar/core/index.js'
import { Seance } from 'api/enseignant'
import { seanceApi } from '@/api/seance'
import { enseignantApi } from '@/api/enseignant'
import { PDFExportModal } from '@/components/PDFExportModal'
import { Calendar, Users, BookOpen, FileDown } from 'lucide-react'
import api from '@/api/api'
import type { AppError } from '@/utils/errorHandling'

const FILTER_STORAGE_KEY = 'dashboard.showOnlyMySurveillances'

export function DashboardHome() {
  const navigate = useNavigate()
  const { userId, etatSurveillant, role } = useAuthStore()
  const { data: seances = [], isLoading: seancesLoading } = useSeances()
  const { data: enseignants = [], isLoading: enseignantsLoading } = useEnseignants()
  const { data: matieres = [], isLoading: matieresLoading } = useMatieres()

  
  const [showOnlyMySurveillances, setShowOnlyMySurveillances] = useState(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    return saved === 'true'
  })

  
  const [pdfModalOpen, setPdfModalOpen] = useState(false)

  
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, String(showOnlyMySurveillances))
  }, [showOnlyMySurveillances])

  
  const filteredSeances = useMemo(() => {
    if (!showOnlyMySurveillances || !userId || !enseignants.length) {
      return seances
    }

    
    const currentEnseignant = enseignants.find((e: typeof enseignants[0]) => e.id === userId)

    if (!currentEnseignant || !currentEnseignant.seances) {
      return []
    }

    
    const mySeanceIds = new Set(currentEnseignant.seances.map((s: typeof currentEnseignant.seances[0]) => s.id))

    
    return seances.filter((s: typeof seances[0]) => mySeanceIds.has(s.id))
  }, [seances, showOnlyMySurveillances, userId, enseignants])

  const totalSeances = filteredSeances.length

  
  const [chargeSurveillance, setChargeSurveillance] = useState<number | null>(null)
  const [m, setM] = useState<number | null>(null)

  useEffect(() => {
    if (userId && role === 'ENSEIGNANT') {
      enseignantApi.calculerChargeSurveillance(userId)
        .then(response => {
          setChargeSurveillance(response.data.chargeSurveillance)
          setM(response.data.m);
        })
        .catch(err => {
          const error = err as AppError
          console.error('Failed to fetch N value:', error)
        })
    }
  }, [userId, role])

  
  const countEnseignantsForSeance = (seanceId: number): number => {
    if (!enseignants.length) return 0

    let count = 0
    enseignants.forEach((enseignant: typeof enseignants[0]) => {
      if (enseignant.seances?.some((s: typeof enseignant.seances[0]) => s.id === seanceId)) {
        count++
      }
    })
    return count
  }

  
  const getSeanceColor = (id: number) => {
    const colors = [
      '#3B82F6', 
      '#10B981', 
      '#F59E0B', 
      '#EF4444', 
      '#8B5CF6', 
      '#EC4899', 
      '#14B8A6', 
      '#F97316', 
      '#6366F1', 
      '#84CC16', 
    ]
    return colors[id % colors.length]
  }


  
  const seancesByDate = filteredSeances.reduce((acc: Record<string, typeof seances>, s: typeof seances[0]) => {
    const date = s.seanceDate
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(s)
    return acc
  }, {} as Record<string, typeof seances>)

  
  const events = Object.entries(seancesByDate).flatMap(([date, daySeances]: [string, typeof seances]) => {
    const sortedSeances = daySeances.sort((a: typeof seances[0], b: typeof seances[0]) => {
      const aStart = a.horaire?.embHoraire?.hdebut ?? 8
      const bStart = b.horaire?.embHoraire?.hdebut ?? 8
      return aStart - bStart
    })

    
    const visibleSeances = sortedSeances.slice(0, 3)
    const hiddenCount = sortedSeances.length - 3

    const visibleEvents = visibleSeances.map((s: typeof seances[0]) => {
      const color = getSeanceColor(s.id)
      const hDebut = s.horaire?.embHoraire?.hdebut ?? 8
      const hFin = s.horaire?.embHoraire?.hfin ?? 10

      const startStr = `${s.seanceDate}T${String(hDebut).padStart(2, '0')}:00:00`
      const endStr = `${s.seanceDate}T${String(hFin).padStart(2, '0')}:00:00`

      
      const matieresList = s.matieres?.map((m: { nom: string }) => m.nom) || []
      const matiereNames = matieresList.slice(0, 2).join(', ')
      const extraMatieres = matieresList.length > 2 ? ` +${matieresList.length - 2}` : ''

      
      const nbSurveillants = countEnseignantsForSeance(s.id)

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
          matieres: matiereNames + extraMatieres,
          surveillants: `Surveillants: ${nbSurveillants}`,
          seanceId: s.id,
          verrouillee: s.verrouillee,
          passeeExamen: s.passeeExamen
        }
      }
    })

    
    if (hiddenCount > 0) {
      const showMoreEvent = {
        id: `more-${date}`,
        title: `+${hiddenCount} séance${hiddenCount > 1 ? 's' : ''}`,
        start: `${date}T16:00:00`,
        end: `${date}T16:30:00`,
        backgroundColor: '#64748b',
        borderColor: '#64748b',
        textColor: '#ffffff',
        display: 'background' as const,
        extendedProps: {
          isMoreIndicator: true,
          details: 'Cliquez pour voir toutes les séances',
          matieres: '',
          surveillants: ''
        }
      }
      return [...visibleEvents, showMoreEvent]
    }

    return visibleEvents
  })


  
  const EventContent = ({ eventInfo }: { eventInfo: any }) => {
    const [requiredN, setRequiredN] = useState<number | null>(null)
    const seanceId = eventInfo.event.extendedProps.seanceId

    useEffect(() => {
      if (seanceId) {
        seanceApi.calculerSurveillantsRequis(seanceId)
          .then(response => {
            setRequiredN(response.data.n)
          })
          .catch(error => {
            console.error('Failed to fetch required surveillants:', error)
          })
      }
    }, [seanceId])

    const nbAssigned = eventInfo.event.extendedProps.surveillants.match(/\d+/)?.[0] || '0'
    const nbRequired = requiredN !== null ? requiredN : '...'

    return (
      <div className="w-full h-full p-1 text-white overflow-hidden rounded">
        <div className="font-semibold text-xs truncate">
          {eventInfo.event.title}
          {eventInfo.event.extendedProps.verrouillee && ' 🔒'}
          {eventInfo.event.extendedProps.passeeExamen && ' ✓'}
        </div>
        <div className="text-[10px] opacity-90 truncate">{eventInfo.event.extendedProps.details}</div>
        <div className="text-[10px] opacity-80 truncate">{eventInfo.event.extendedProps.matieres}</div>
        <div className="text-[10px] opacity-80 font-medium">
          👥 {nbAssigned}/{nbRequired}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-slate-500">
            Vision globale sur les séances, enseignants et matières.
          </p>
        </div>

        
        {etatSurveillant === 'SURVEILLANT' && (
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              id="filter-my-surveillances"
              checked={showOnlyMySurveillances}
              onChange={(e) => setShowOnlyMySurveillances(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-blue-600"
              aria-label="Afficher seulement mes surveillances"
            />
            <label
              htmlFor="filter-my-surveillances"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Afficher seulement mes surveillances
            </label>
          </div>
        )}

        
        {(etatSurveillant === 'SURVEILLANT' || role === 'ADMIN') && (
          <Button
            onClick={() => setPdfModalOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            {role === 'ADMIN' ? 'Exporter PDF' : 'Mon PDF'}
          </Button>
        )}
        {/* <Button onClick={() => navigate('/seances')}>Voir les séances</Button> */}
      </div>

      <div className={`grid ${role == "ENSEIGNANT" ? 'gap-4 md:grid-cols-2 lg:grid-cols-4' : 'gap-3 md:grid-cols-2 lg:grid-cols-3'}`}>
        <Card>
          <CardHeader>
            <CardTitle>Séances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {seancesLoading ? '...' : totalSeances}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enseignants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {enseignantsLoading ? '...' : enseignants.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matières</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {matieresLoading ? '...' : matieres.length}
            </p>
            <p className="text-xs text-slate-500">Nombre total de matières dans le système</p>
          </CardContent>
        </Card>

        
        {role === 'ENSEIGNANT' && (
          <Card>
            <CardHeader>
              <CardTitle>Ma charge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {chargeSurveillance !== null ? chargeSurveillance : '...'}
              </p>
            </CardContent>
          </Card>
        )}

        
        {/* {role === 'ENSEIGNANT' && (
          <Card>
            <CardHeader>
              <CardTitle>M</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {m !== null ? m : '...'}
              </p>
              <p className="text-xs text-slate-500">M</p>
            </CardContent>
          </Card>
        )} */}
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
              
              navigate(`/create-seance/${info.dateStr}`)
            }}
            eventContent={(eventInfo) => <EventContent eventInfo={eventInfo} />}
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

      
      <PDFExportModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        role={role as 'ADMIN' | 'ENSEIGNANT'}
        userId={userId!}
        enseignants={enseignants}
        seances={seances}
      />
    </div>
  )
}
