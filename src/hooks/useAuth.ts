import { useMutation } from '@tanstack/react-query'
import { enseignantApi, LoginPayload, LoginResponse } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

export function useLogin() {
  const { login } = useAuthStore()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      enseignantApi.login(payload).then((res) => res.data as LoginResponse),
    onSuccess: (data) => {
      login(data.token, data.username, data.role)
      toast({ title: 'Connexion réussie' })
    },
    onError: () =>
      toast({
        title: 'Échec de la connexion',
        description: 'Vérifiez vos identifiants.',
        variant: 'destructive'
      })
  })
}
