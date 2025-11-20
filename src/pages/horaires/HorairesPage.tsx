import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { useHoraires } from '@/hooks/useHoraires'

const PAGE_SIZE = 8

type HoraireForm = {
  id?: number
  libelle: string
  dateDebut: string
  dateFin: string
}

export function HorairesPage() {
  const { data: horaires = [], isLoading, addMutation, editMutation, deleteMutation } = useHoraires()

  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<HoraireForm | null>(null)

  const form = useForm<HoraireForm>({
    defaultValues: {
      libelle: '',
      dateDebut: '',
      dateFin: ''
    }
  })

  useEffect(() => {
    if (!open) {
      form.reset({ libelle: '', dateDebut: '', dateFin: '' })
      setEditing(null)
    }
  }, [open, form])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return horaires.slice(start, start + PAGE_SIZE)
  }, [horaires, page])

  useEffect(() => {
    setPage(1)
  }, [horaires])

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleEdit = (horaire: any) => {
    const payload: HoraireForm = {
      id: horaire.id,
      libelle: horaire.libelle ?? '',
      dateDebut: horaire.dateDebut?.slice(0, 16) ?? '',
      dateFin: horaire.dateFin?.slice(0, 16) ?? ''
    }
    setEditing(payload)
    form.reset(payload)
    setOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Supprimer cet horaire ?')) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (values: HoraireForm) => {
    const payload = {
      id: values.id,
      libelle: values.libelle,
      dateDebut: values.dateDebut,
      dateFin: values.dateFin
    }

    if (editing) {
      editMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    } else {
      addMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    }
  }

  const pageCount = Math.ceil(horaires.length / PAGE_SIZE)

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Horaires</h1>
          <p className="text-sm text-slate-500">Gestion des créneaux d&apos;examen.</p>
        </div>
        <Button onClick={handleAdd}>Ajouter</Button>
      </header>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Aucun horaire
                </TableCell>
              </TableRow>
            )}
            {paginated.map((horaire: any) => (
              <TableRow key={horaire.id}>
                <TableCell>{horaire.libelle}</TableCell>
                <TableCell>{horaire.dateDebut}</TableCell>
                <TableCell>{horaire.dateFin}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(horaire)}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(horaire.id)}>
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier un horaire' : 'Nouvel horaire'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit({ ...values, id: editing?.id }))} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="libelle"
              rules={{ required: 'Libellé requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Séance du matin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateDebut"
              rules={{ required: 'Date de début requise' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Début</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateFin"
              rules={{ required: 'Date de fin requise' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
                {addMutation.isPending || editMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </Dialog>
    </section>
  )
}
