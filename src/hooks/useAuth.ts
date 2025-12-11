// hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query'
import { enseignantApi, LoginPayload, LoginResponse } from '@/api/enseignant'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

export function useLogin() {
  const { login } = useAuthStore()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const loginResponse = await enseignantApi.login(payload)
      const loginData = loginResponse.data as LoginResponse

      const profileResponse = await enseignantApi.profile(loginData.token)
      const profile = profileResponse.data

      return { loginData, profile }
    },
    onSuccess: ({ loginData, profile }) => {
      login({
        token: loginData.token,
        username: profile.username,
        role: profile.role,
        userId: profile.id,
        etatSurveillant: profile.etatSurveillant === 'SURVEILLANT' ? 'SURVEILLANT' : 'NON_SURVEILLANT',
      })

      toast({ title: 'Connexion réussie' })
    },
    onError: (err: any) => {
      toast({
        title: 'Échec de la connexion',
        description: err?.response?.data?.message || 'Identifiants incorrects',
        variant: 'destructive',
      })
    },
  })
}