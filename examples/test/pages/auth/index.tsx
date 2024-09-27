import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormLabel, FormMessage, FormRootMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ActionArgs, defineAction, LoaderArgs } from 'ziro/router'
import { useAction } from 'ziro/router/client'
import { redirect } from 'ziro/router/redirect'
import { z } from 'zod'
import { login } from '../../middlewares/auth'

export const loader = async (args: LoaderArgs<'/auth'>) => {
  return {
    ok: true,
  }
}

export const actions = {
  login: defineAction({
    input: z.object({
      username: z.string().min(1, 'This field is required'),
      password: z.string().min(1, 'This field is required'),
    }),
    async handler(input, { utils, serverContext }: ActionArgs<'/auth'>) {
      if (serverContext) {
        if (input.username[0] == 'a' && input.password[0] == 'a') {
          await login({ username: input.username }, utils.storage.cookies!)
          return redirect('/dashboard')
        }
        return {
          errors: {
            _root: 'Invalid username or password',
          },
          input,
        }
      }
    },
  }),
}

export default function AuthPage() {
  const login = useAction({
    url: '/auth',
    action: 'login',
  })

  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form form={login} className="flex flex-col gap-2">
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input {...login.registerInput('username')} />
            </FormControl>
            <FormMessage />
          </FormField>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" {...login.registerInput('password')} />
            </FormControl>
            <FormMessage />
          </FormField>
          <FormRootMessage />
          <Button className="w-full mt-3" variant="default">
            {login.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}

export const Loading = () => {
  return <span>Auth Loading...</span>
}
