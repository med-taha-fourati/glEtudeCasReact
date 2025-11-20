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
import { useMatieres } from '@/hooks/useMatieres'
import { useEnseignants } from '@/hooks/useEnseignants'

const PAGE_SIZE = 8

type MatiereForm = {
  id?: number
  code: string
  libelle: string
  description?: string
  nbPaquets: number
  responsableId?: number
}

export function MatieresPage() {
  const { data: matieres = [], isLoading, addMutation, editMutation, deleteMutation } = useMatieres()
  const { rawData: enseignants = [] } = useEnseignants()

  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<MatiereForm | null>(null)

  const form = useForm<MatiereForm>({
    defaultValues: {
      code: '',
      libelle: '',
      description: '',
      nbPaquets: 0,
      responsableId: undefined
    }
  })

  useEffect(() => {
    if (!open) {
      form.reset({ code: '', libelle: '', description: '', nbPaquets: 0, responsableId: undefined })
      setEditing(null)
    }
  }, [open, form])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return matieres.slice(start, start + PAGE_SIZE)
  }, [matieres, page])

  useEffect(() => {
    setPage(1)
  }, [matieres])

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleEdit = (matiere: any) => {
    const payload: MatiereForm = {
      id: matiere.id,
      code: matiere.code ?? '',
      libelle: matiere.libelle ?? '',
      description: matiere.description ?? '',
      nbPaquets: matiere.nbPaquets ?? 0,
      responsableId: matiere.responsableId
    }
    setEditing(payload)
    form.reset(payload)
    setOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Supprimer cette matière ?')) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (values: MatiereForm) => {
    const payload = {
      id: values.id,
      code: values.code,
      libelle: values.libelle,
      description: values.description,
      nbPaquets: Number(values.nbPaquets),
      responsableId: values.responsableId
    }

    if (editing) {
      editMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    } else {
      addMutation.mutate(payload, { onSuccess: () => setOpen(false) })
    }
  }

  const pageCount = Math.ceil(matieres.length / PAGE_SIZE)

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Matières</h1>
          <p className="text-sm text-slate-500">Gestion des matières et des paquets d&apos;examen.</p>
        </div>
        <Button onClick={handleAdd}>Ajouter</Button>
      </header>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Nb paquets</TableHead>
              <TableHead>Responsable</TableHead>
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
                  Aucune matière
                </TableCell>
              </TableRow>
            )}
            {paginated.map((matiere: any) => (
              <TableRow key={matiere.id}>
                <TableCell>{matiere.code}</TableCell>
                <TableCell>{matiere.libelle}</TableCell>
                <TableCell>{matiere.description}</TableCell>
                <TableCell>{matiere.nbPaquets}</TableCell>
                <TableCell>
                  {matiere.responsable?.nom ? `${matiere.responsable.nom} ${matiere.responsable.prenom ?? ''}` : '-'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(matiere)}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(matiere.id)}>
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
          <DialogTitle>{editing ? 'Modifier une matière' : 'Nouvelle matière'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => onSubmit({ ...values, id: editing?.id }))} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="code"
              rules={{ required: 'Code requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Code de la matière" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="libelle"
              rules={{ required: 'Libellé requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Libellé" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nbPaquets"
              rules={{ required: 'Nombre de paquets requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de paquets</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsableId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Non défini</option>
                      {enseignants.map((e: any) => (
                        <option key={e.id} value={e.id}>{`${e.nom ?? ''} ${e.prenom ?? ''}`}</option>
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
