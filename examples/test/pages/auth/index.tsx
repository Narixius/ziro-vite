import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { guestGuard } from '@/middlewares/auth'
import { serialize } from 'cookie-es'
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
    async handler(input) {
      //   await new Promise(resolve => setTimeout(resolve, 1000))
      if (input.username[0] == 'a' && input.password[0] == 'a') {
        await new Promise(resolve => setTimeout(resolve, 500))
        const headers = new Headers()

        headers.set('Set-Cookie', serialize('auth', input.username))

        return redirect('/dashboard', 302, {
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
  const { errors, formProps, register, isPending, Form } = useAction('/auth', 'login', {
    preserveValues: {
      enabled: true,
      exclude: ['password'],
    },
  })

  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center tracking-normal">Login</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...formProps} className="flex flex-col gap-2">
          <Label className="flex flex-col gap-0.5 text-gray-600">
            <span className="text-sm font-normal">Username</span>
            <Input {...register('username')} autoComplete="username" invalid={!!errors?.username} />
            <ErrorMessage message={errors?.username} />
          </Label>
          <Label className="flex flex-col gap-0.5 text-gray-600">
            <span className="text-sm font-normal">Password</span>
            <Input {...register('password')} type="password" autoComplete="current-password" invalid={!!errors?.password} />
            <ErrorMessage message={errors?.password} />
          </Label>
          {!!errors?.root && (
            <Alert variant="destructive" className="my-2">
              <AlertDescription>{errors?.root}</AlertDescription>
            </Alert>
          )}
          <Button disabled={isPending} className="w-full" variant="default">
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}

export const Loading = () => {
  return <span>Auth Loading...</span>
}
