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
import { useGrades } from '@/hooks/useGrades'

const PAGE_SIZE = 8

type GradeForm = {
  id?: number
  libelle: string
  coefficient: number
  chargeSurveillance: number
}

export function GradesPage() {
  const { data: grades = [], isLoading, addMutation, editMutation, deleteMutation } = useGrades()

  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<GradeForm | null>(null)

  const form = useForm<GradeForm>({
    defaultValues: {
      libelle: '',
      coefficient: 1,
      chargeSurveillance: 0
    }
  })

  useEffect(() => {
    if (!open) {
      form.reset({ libelle: '', coefficient: 1, chargeSurveillance: 0 })
      setEditing(null)
    }
  }, [open, form])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return grades.slice(start, start + PAGE_SIZE)
  }, [grades, page])

  useEffect(() => {
    setPage(1)
  }, [grades])

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleEdit = (grade: any) => {
    const payload: GradeForm = {
      id: grade.id,
      libelle: grade.libelle ?? '',
      coefficient: grade.coefficient ?? 1,
      chargeSurveillance: grade.chargeSurveillance ?? 0
    }
    setEditing(payload)
    form.reset(payload)
    setOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Supprimer ce grade ?')) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (values: GradeForm) => {
    const payload = {
      id: values.id,
      libelle: values.libelle,
      coefficient: Number(values.coefficient),
      chargeSurveillance: Number(values.chargeSurveillance)
    }

    if (editing) {
      editMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    } else {
      addMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    }
  }

  const pageCount = Math.ceil(grades.length / PAGE_SIZE)

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Grades</h1>
          <p className="text-sm text-slate-500">Gestion des grades et de la charge de surveillance.</p>
        </div>
        <Button onClick={handleAdd}>Ajouter</Button>
      </header>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Coefficient</TableHead>
              <TableHead>Charge de surveillance</TableHead>
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
                  Aucun grade
                </TableCell>
              </TableRow>
            )}
            {paginated.map((grade: any) => (
              <TableRow key={grade.id}>
                <TableCell>{grade.libelle}</TableCell>
                <TableCell>{grade.coefficient}</TableCell>
                <TableCell>{grade.chargeSurveillance}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(grade)}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(grade.id)}>
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
          <DialogTitle>{editing ? 'Modifier un grade' : 'Nouveau grade'}</DialogTitle>
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
                    <Input {...field} placeholder="Libération" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coefficient"
              rules={{ required: 'Coefficient requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coefficient</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} step={0.1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chargeSurveillance"
              rules={{ required: 'Charge de surveillance requise' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charge de surveillance (heures)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} />
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
