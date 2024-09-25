import { ActionArgs, defineAction, LoaderArgs } from 'ziro/router'
import { useAction, useRouter } from 'ziro/router/client'
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
      username: z.string().min(1),
      password: z.string().min(1),
    }),
    async handler(input, { utils, serverContext }: ActionArgs<'/auth'>) {
      if (serverContext) {
        if (input.username == 'admin' && input.password == 'admin') {
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
  const router = useRouter()

  const login = useAction({
    url: '/auth',
    action: 'login',
    onSuccess() {
      router!.push('/dashboard')
    },
  })

  return (
    <div className="preview flex min-h-[350px] w-full justify-center p-10 items-center">
      <form {...login.form} className="px-6 gap-2 flex flex-col rounded-xl border bg-card text-card-foreground shadow w-[350px]">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Login</h3>
          <p className="text-sm text-muted-foreground">Click the button below to sign in</p>
        </div>
        <div className="flex flex-col gap-2">
          <input
            {...login.registerInput('username')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="username"
          />
          {login.errors?.username && <p className="text-sm text-red-500">{login.errors.username}</p>}
          <input
            {...login.registerInput('password')}
            type="password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
          />
          {login.errors?.password && <p className="text-sm text-red-500">{login.errors.password}</p>}
        </div>

        {login.errors?._root && <p className="text-sm text-red-500">{login.errors._root}</p>}

        <div className="items-center p-6 pt-0 flex mt-6 justify-center">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            {login.isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}
