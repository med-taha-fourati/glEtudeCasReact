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
import { useEnseignants } from '@/hooks/useEnseignants'
import { useGrades } from '@/hooks/useGrades'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 8

type EnseignantForm = {
  id?: number
  nom: string
  prenom: string
  tel: string
  gradeId?: number
}

export function EnseignantList() {
  const {
    data: enseignants = [],
    isLoading,
    searchTerm,
    setSearchTerm,
    createMutation,
    updateMutation,
    deleteMutation
  } = useEnseignants()
  const { data: grades = [] } = useGrades()

  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<EnseignantForm | null>(null)

  const form = useForm<EnseignantForm>({
    defaultValues: {
      nom: '',
      prenom: '',
      tel: ''
    }
  })

  useEffect(() => {
    if (!open) {
      form.reset({ nom: '', prenom: '', tel: '', gradeId: undefined })
      setEditing(null)
    }
  }, [open, form])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return enseignants.slice(start, start + PAGE_SIZE)
  }, [enseignants, page])

  useEffect(() => {
    setPage(1)
  }, [enseignants])

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleEdit = (enseignant: any) => {
    setEditing({
      id: enseignant.id,
      nom: enseignant.nom ?? '',
      prenom: enseignant.prenom ?? '',
      tel: enseignant.tel?.toString() ?? '',
      gradeId: enseignant.grade?.id
    })
    form.reset({
      nom: enseignant.nom ?? '',
      prenom: enseignant.prenom ?? '',
      tel: enseignant.tel?.toString() ?? '',
      gradeId: enseignant.grade?.id
    })
    setOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Supprimer cet enseignant ?')) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (values: EnseignantForm) => {
    const payload = {
      id: values.id,
      nom: values.nom,
      prenom: values.prenom,
      tel: Number(values.tel),
      gradeId: values.gradeId
    }

    if (editing) {
      updateMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    } else {
      createMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    }
  }

  const pageCount = Math.ceil(enseignants.length / PAGE_SIZE)

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Enseignants</h1>
          <p className="text-sm text-slate-500">Gestion des enseignants et charges de surveillance.</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom"
            className="w-56"
          />
          <Button onClick={handleAdd}>Ajouter</Button>
        </div>
      </header>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Charge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucun enseignant
                </TableCell>
              </TableRow>
            )}
            {paginated.map((enseignant: any) => (
              <TableRow key={enseignant.id}>
                <TableCell>{enseignant.nom}</TableCell>
                <TableCell>{enseignant.prenom}</TableCell>
                <TableCell>{enseignant.tel}</TableCell>
                <TableCell>{enseignant.grade?.libelle ?? 'N/A'}</TableCell>
                <TableCell>
                  {enseignant.grade?.chargeSurveillance ? (
                    <Badge variant="secondary">{enseignant.grade.chargeSurveillance} h</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(enseignant)}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(enseignant.id)}>
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
          <DialogTitle>{editing ? 'Modifier un enseignant' : 'Nouvel enseignant'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit({ ...values, id: editing?.id }))}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="nom"
              rules={{ required: 'Nom requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nom" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prenom"
              rules={{ required: 'Prénom requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Prénom" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tel"
              rules={{ required: 'Téléphone requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 22123456" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Non défini</option>
                      {grades?.map((grade: any) => (
                        <option key={grade.id} value={grade.id}>
                          {grade.libelle} (Charge {grade.chargeSurveillance})
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </Dialog>
    </section>
  )
}
