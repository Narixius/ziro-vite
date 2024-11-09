import { RouteProps, useAction } from 'ziro2/react'
import { Action, LoaderArgs, redirect } from 'ziro2/router'
import { z } from 'zod'
import { authGuard } from '~/middlewares/auth'

export const middlewares = [authGuard]

export const loader = async (ctx: LoaderArgs<'/dashboard'>) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    user: localStorage.getItem('username'),
  }
}

export const actions = {
  logout: new Action({
    input: z.any(),
    handler: async () => {
      //   const headers = new Headers()
      // clear cookie
      //   headers.set('auth', serialize('token', '', { expires: new Date(0) }))
      //   return redirect('/auth', 301, {
      //     headers,
      //   })
      localStorage.removeItem('username')
      return redirect('/auth')
    },
  }),
}

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  const logout = useAction('/dashboard', 'logout')

  return (
    <div className="flex flex-col p-8 gap-2">
      <span>You are logged in as {props.loaderData.user}</span>
      <form {...logout.formProps}>
        <button type="submit" className="border border-red-500 bg-red-300 rounded-md px-2 py-1 text-sm">
          Logout
        </button>
      </form>
    </div>
  )
}

export const Loading = () => {
  return <span>Loading Dashboard</span>
}
