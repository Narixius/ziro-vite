import { serialize } from 'cookie-es'
import { RouteProps, useAction } from 'ziro2/react'
import { Action, LoaderArgs, redirect } from 'ziro2/router'
import { z } from 'zod'
import { authGuard } from '~/middlewares/auth'

export const middlewares = [authGuard]

export const loader = async (ctx: LoaderArgs<'/dashboard'>) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return {}
}

export const actions = {
  logout: new Action({
    input: z.any(),
    handler: async () => {
      const headers = new Headers()
      headers.set(
        'Set-Cookie',
        serialize('auth', '', {
          maxAge: 0,
        }),
      )
      return redirect('/auth', 302, { headers })
    },
  }),
}

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  const logout = useAction('/dashboard', 'logout')

  return (
    <div className="flex flex-col p-8 gap-2">
      <span>You are logged in as {props.dataContext.user}</span>
      <logout.Form>
        <button type="submit" className="border border-red-500 bg-red-300 rounded-md px-2 py-1 text-sm">
          Logout
        </button>
      </logout.Form>
    </div>
  )
}

export const Loading = () => {
  return <span>Loading Dashboard</span>
}
