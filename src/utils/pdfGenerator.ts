import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Enseignant = {
    id: number
    nom: string
    prenom: string
    seances?: Array<{
        id: number
        seanceDate: string
        horaire?: {
            embHoraire: {
                hdebut: number  // lowercase!
                hfin: number    // lowercase!
            }
        }
        matieres?: Array<{
            nom: string
        }>
    }>
}

type SeanceForPDF = {
    date: string
    hDebut: number
    hFin: number
    matiere: string
}

const HOUR_COLUMNS = [
    '8-9',
    '9-10',
    '10-11',
    '11-12',
    '12-13',
    '13-14',
    '14-15',
    '15-16'
]

/**
 * Maps a séance to the column indices it should occupy
 * Handles clipping to 8-16 range and multi-hour spans
 */
function mapSeanceToColumns(hDebut: number, hFin: number): number[] {
    // Clip to 8-16 range
    const clampedStart = Math.max(8, Math.min(16, hDebut))
    const clampedEnd = Math.max(8, Math.min(16, hFin))

    const columns: number[] = []

    // Calculate which hour columns this séance occupies
    for (let h = Math.floor(clampedStart); h < Math.ceil(clampedEnd); h++) {
        if (h >= 8 && h < 16) {
            columns.push(h - 8)  // 8→0, 9→1, ..., 15→7
        }
    }

    return columns
}

/**
 * Builds the time-grid structure from séances
 */
function buildTimeGrid(seances: SeanceForPDF[], startDate: string, endDate: string) {
    // Generate all dates in range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates: string[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dates.push(dateStr)
    }

    // Build grid: date -> hour column -> matiere(s)
    const grid = dates.map(date => {
        const daySeances = seances.filter(s => s.date === date)
        const row: (string | null)[] = new Array(8).fill(null)

        daySeances.forEach(seance => {
            const columns = mapSeanceToColumns(seance.hDebut, seance.hFin)
            columns.forEach(colIdx => {
                row[colIdx] = seance.matiere
            })
        })

        return { date, columns: row }
    })

    return grid
}

/**
 * Generates a surveillance PDF for an enseignant
 */
export function generateSurveillancePDF(
    enseignant: Enseignant,
    seances: any[],  // Pre-filtered seances with full data
    startDate: string,
    endDate: string
) {
    console.log('=== PDF Generation Debug ===')
    console.log('Start date:', startDate)
    console.log('End date:', endDate)
    console.log('Enseignant:', enseignant.nom, enseignant.prenom)
    console.log('Séances passed:', seances.length)

    // Transform séances to PDF format
    const seancesInRange: SeanceForPDF[] = []

    seances.forEach(s => {
        console.log('Processing séance:', s.id, 'Date:', s.seanceDate)

        // Normalize dates for comparison
        const seanceDate = s.seanceDate.split('T')[0]
        const start = startDate.split('T')[0]
        const end = endDate.split('T')[0]

        console.log('  Date check:', seanceDate, 'in range', start, '-', end)

        if (seanceDate >= start && seanceDate <= end) {
            // Debug horaire structure in detail
            console.log('  Full séance object:', s)
            console.log('  s.horaire:', s.horaire)
            console.log('  s.horaire?.embHoraire:', s.horaire?.embHoraire)

            // FIX: Properties are lowercase in API response!
            const hDebut = s.horaire?.embHoraire?.hdebut ?? 8
            const hFin = s.horaire?.embHoraire?.hfin ?? 9

            console.log('  Resolved hDebut:', hDebut, 'hFin:', hFin)

            // Debug matière structure
            console.log('  Matières:', s.matieres)
            const matiere = s.matieres?.[0]?.nom ?? 'Sans matière'

            console.log('  ✓ INCLUDED:', matiere, `${hDebut} h - ${hFin} h`)

            seancesInRange.push({
                date: seanceDate,
                hDebut,
                hFin,
                matiere
            })
        }
    })

    console.log('Final séances count:', seancesInRange.length)
    console.log('Séances for PDF:', seancesInRange)

    // Create PDF
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    })

    // Header
    doc.setFontSize(16)
    doc.text(`Surveillance - ${enseignant.nom} ${enseignant.prenom} `, 14, 15)

    doc.setFontSize(10)
    doc.text(`Période: ${formatDate(startDate)} → ${formatDate(endDate)} `, 14, 22)
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')} `, 14, 27)

    if (seancesInRange.length === 0) {
        doc.setFontSize(12)
        doc.text('Aucune séance trouvée pour cette période.', 14, 40)
    } else {
        // Build grid
        const grid = buildTimeGrid(seancesInRange, startDate, endDate)

        // Create table data
        const tableData = grid.map(row => [
            formatDate(row.date),
            ...row.columns.map(cell => cell || '')
        ])

        // Generate table
        autoTable(doc, {
            startY: 35,
            head: [['Date', ...HOUR_COLUMNS]],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                halign: 'center',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold' }
            },
            didDrawPage: (data) => {
                // Footer with page number
                const pageCount = (doc as any).internal.getNumberOfPages()
                const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber
                doc.setFontSize(8)
                doc.text(
                    `Page ${pageNumber}/${pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                )
            }
        })
    }

    // Download
    const filename = `surveillance_${enseignant.nom}_${enseignant.prenom}_${startDate}_${endDate}.pdf`
    doc.save(filename)
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR')
}
