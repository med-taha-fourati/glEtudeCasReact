import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/use-toast'
import { useMutation } from '@tanstack/react-query'
import { enseignantApi } from '@/api/enseignant'

interface RegisterFormValues {
  username: string
  email: string
  password: string
  role: 'ADMIN' | 'ENSEIGNANT',
  etatSurveillant: string,
  gradeId: number
}

export function RegisterPage() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'ENSEIGNANT',
      etatSurveillant: 'PAS_SURVEILLANT',
      gradeId: 1
    }
  })

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterFormValues) => enseignantApi.register(payload),
    onSuccess: () => {
      toast({ title: 'Compte créé' })
      navigate('/login', { replace: true })
    }
  })

  const onSubmit = (values: RegisterFormValues) => registerMutation.mutate(values)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                rules={{ required: 'Nom requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d&apos;utilisateur</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nom" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{ required: 'Email requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="user@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'Mot de passe requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="ENSEIGNANT">Enseignant</option>
                        <option value="ADMIN">Responsable SE</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Création...' : 'Créer le compte'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
