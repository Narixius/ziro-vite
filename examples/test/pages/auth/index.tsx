import { ActionArgs, defineAction, LoaderArgs } from 'ziro/router'
import { abort } from 'ziro/router/abort'
import { useAction, useRouter } from 'ziro/router/client'
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
      email: z.string().email(),
      password: z.string().min(6),
      names: z.array(z.string().min(1)),
    }),
    async handler({ email, password }, { utils, serverContext }: ActionArgs<'/auth'>) {
      if (serverContext) {
        if (email == 'admin' && password == 'admin') {
          const token = await login(email, utils.storage.cookies!)
          return {
            ok: true,
            message: 'Signed in successfully',
            token: token,
          }
        }
        abort(403, 'invalid request')
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
  console.log(login.errors)

  return (
    <div className="preview flex min-h-[350px] w-full justify-center p-10 items-center">
      <form {...login.formProps} className="rounded-xl border bg-card text-card-foreground shadow w-[350px]">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Login</h3>
          <p className="text-sm text-muted-foreground">Click the button below to sign in</p>
        </div>
        <div className="flex flex-col px-6 gap-2">
          <input
            name="email"
            type="email"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="email@example.com"
          />
          {login.errors?.email && <p className="text-sm text-red-500">{login.errors.email}</p>}
          <input
            name="password"
            type="password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
          />
          {login.errors?.password && <p className="text-sm text-red-500">{login.errors.password}</p>}
          <input
            name="names"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="name1"
          />
          {login.errors?.names && login.errors?.names[0] && <p className="text-sm text-red-500">{login.errors?.names[0]}</p>}
          <input
            name="names"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="name2"
          />
          {login.errors?.names && login.errors?.names[1] && <p className="text-sm text-red-500">{login.errors?.names[1]}</p>}
        </div>
        <div className="items-center p-6 pt-0 flex mt-6 justify-center">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            {login.isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}
