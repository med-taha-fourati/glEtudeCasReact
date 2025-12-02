import { useMutation } from '@tanstack/react-query'
import { enseignantApi, LoginPayload, LoginResponse } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

export function useLogin() {
  const { login } = useAuthStore()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      // Step 1: Login and get token
      const loginResponse = await enseignantApi.login(payload)
      const loginData = loginResponse.data as LoginResponse

      // Step 2: Fetch profile to get userId
      const profileResponse = await enseignantApi.profile(loginData.token)
      const profile = profileResponse.data

      return { loginData, profile }
    },
    onSuccess: ({ loginData, profile }) => {
      login(loginData.token, profile.username, profile.role, profile.id)
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
