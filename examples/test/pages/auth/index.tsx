import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { guestGuard, login } from '@/middlewares/auth'
import { useAction } from 'ziro2/react'
import { Action, MetaFn, redirect } from 'ziro2/router'
import { z } from 'zod'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { ErrorMessage } from '~/components/ui/error-message'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export const middlewares = [guestGuard]

export const meta: MetaFn<'/auth'> = async () => {
  return {
    title: 'Login',
  }
}

export const actions = {
  login: new Action({
    input: z.object({
      username: z.string().min(3, 'This field is required'),
      password: z.string().min(4, 'This field is required'),
    }),
    async handler(input, { dataContext }) {
      if (input.username[0] == 'a' && input.password[0] == 'a') {
        const token = await login({ username: input.username })
        const headers = new Headers()
        headers.set('token', token)
        localStorage.setItem('username', input.username)
        return redirect('/dashboard', {
          headers,
        })
      }
      throw new Error('Invalid credentials')
    },
  }),
  register: new Action({
    input: z.object({
      name: z.string(),
      password: z.string(),
    }),
    async handler() {
      return 'ok'
    },
  }),
}

export default function AuthPage() {
  const loginAction = useAction('/auth', 'login', {
    preserveValues: {
      enabled: true,
      exclude: ['password'],
    },
  })
  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form {...loginAction.formProps} className="flex flex-col gap-2">
          <Label className="flex flex-col gap-0.5 text-gray-600">
            <span className="text-sm font-normal">Username</span>
            <Input name="username" autoComplete="username" invalid={!!loginAction.errors?.username} />
            <ErrorMessage message={loginAction.errors?.username} />
          </Label>
          <Label className="flex flex-col gap-0.5 text-gray-600">
            <span className="text-sm font-normal">Password</span>
            <Input type="password" autoComplete="current-password" name="password" invalid={!!loginAction.errors?.password} />
            <ErrorMessage message={loginAction.errors?.password} />
          </Label>
          {!!loginAction.errors?.root && (
            <Alert variant="destructive">
              <AlertDescription>{loginAction.errors?.root}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" variant="default">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export const Loading = () => {
  return <span>Auth Loading...</span>
}
