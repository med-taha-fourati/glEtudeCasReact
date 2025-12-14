import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  enseignantApi,
  Enseignant,
  Seance
} from '@/api/enseignant'
import { seanceApi } from '@/api/seance'
import { useToast } from '@/components/ui/use-toast'


const resolveSeance = async (
  id: number,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<Seance> => {
  // 1️⃣ Check cache first
  const cached = queryClient.getQueryData<Seance>(['seance', id])
  if (cached) return cached

  // 2️⃣ Fetch from API
  const res = await seanceApi.fetch(id)

  // 3️⃣ Store in cache
  queryClient.setQueryData(['seance', id], res.data)

  return res.data
}

const normalizeEnseignantAsync = async (
  e: Enseignant,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<Enseignant> => {
  if (!e.seances || e.seances.length === 0) return e

  const resolvedSeances: Seance[] = []

  for (const s of e.seances) {
    if (typeof s === 'number') {
      resolvedSeances.push(await resolveSeance(s, queryClient))
    } else {
      resolvedSeances.push(s)
    }
  }

  return {
    ...e,
    seances: resolvedSeances
  }
}

export function useEnseignants() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  
  const listQuery = useQuery({
    queryKey: ['enseignants'],
    queryFn: async () => {
      const res = await enseignantApi.fetchAll()

      // Resolve seance IDs → objects
      return Promise.all(
        res.data.map((e) => normalizeEnseignantAsync(e, queryClient))
      )
    }
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['enseignants'] })

  
  const createMutation = useMutation({
    mutationFn: (payload: import('@/api/enseignant').EnseignantDTO) =>
      enseignantApi.register(payload),
    onSuccess: () => {
      toast({ title: 'Enseignant créé' })
      invalidate()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (
      payload: { id: number } &
        import('@/api/enseignant').EnseignantDTO
    ) => {
      const { id, ...rest } = payload
      return enseignantApi.edit(id, rest)
    },
    onSuccess: () => {
      toast({ title: 'Enseignant mis à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => enseignantApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Enseignant supprimé' })
      invalidate()
    }
  })

  
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return listQuery.data ?? []

    return (listQuery.data ?? []).filter((e) =>
      `${e.nom ?? ''} ${e.prenom ?? ''}`
        .toLowerCase()
        .includes(term)
    )
  }, [listQuery.data, searchTerm])

  
  return {
    ...listQuery,
    data: filtered,
    rawData: listQuery.data ?? [],
    searchTerm,
    setSearchTerm,
    createMutation,
    updateMutation,
    deleteMutation
  }
}
