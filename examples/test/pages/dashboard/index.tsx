import { serialize } from 'cookie-es'
import { RouteProps } from 'ziro/router'
import { useAction } from 'ziro/router/hooks'
import { Action, LoaderArgs, redirect } from 'ziro2/router'
import { z } from 'zod'

// export const middlewares = [authGuard]

export const actions = {
  logout: new Action({
    input: z.any(),
    handler: async () => {
      const headers = new Headers()
      headers.set('auth', serialize('token', '', { expires: new Date(0) }))
      return redirect('/auth', 301, {
        headers,
      })
    },
  }),
}

export const loader = async (props: LoaderArgs<'/dashboard'>) => {
  return {
    ok: true,
  }
}

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  const logout = useAction({
    url: '/dashboard',
    action: 'logout',
  })
  return (
    <div className="flex flex-col p-8 gap-2">
      <span>
        You are logged in as <span>{props.loaderData.user.username}</span>
      </span>
      <form {...logout.form}>
        <button type="submit" className="border border-red-500 bg-red-300 rounded-md px-2 py-1 text-sm">
          Logout
        </button>
      </form>
    </div>
  )
}

export const Loading = () => {
  return <span>Loading...</span>
}
