import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gradeApi, Grade } from '@/api/grade'
import { useToast } from '@/components/ui/use-toast'

export function useGrades() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradeApi.fetchAll().then((res) => res.data)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['grades'] })

  const addMutation = useMutation({
    mutationFn: (payload: Partial<Grade>) => gradeApi.add(payload),
    onSuccess: () => {
      toast({ title: 'Grade ajouté' })
      invalidate()
    }
  })

  const editMutation = useMutation({
    mutationFn: (payload: Partial<Grade>) => gradeApi.edit(payload),
    onSuccess: () => {
      toast({ title: 'Grade mis à jour' })
      invalidate()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => gradeApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Grade supprimé' })
      invalidate()
    }
  })

  return {
    ...listQuery,
    addMutation,
    editMutation,
    deleteMutation
  }
}
