import { ActionArgs, defineAction, LoaderArgs, RouteProps } from 'ziro/router'
import { useAction } from 'ziro/router/client'
import { redirect } from 'ziro/router/redirect'
import { auth, logout } from '../../middlewares/auth'

export const middlewares = [auth]

export const actions = {
  logout: defineAction({
    handler: async (body, { utils }: ActionArgs<'/dashboard'>) => {
      await logout(utils.storage.cookies!)
      return redirect('/auth')
    },
  }),
}

export const loader = async (ctx: LoaderArgs<'/dashboard'>) => {
  return {
    user: ctx.dataContext.user,
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
