import { LoaderArgs, RouteProps } from 'ziro/router'
import { auth } from '../../middlewares/auth'

export const middlewares = [auth]

export const loader = async (ctx: LoaderArgs<'/dashboard'>) => {
  return {
    user: ctx.dataContext.user,
  }
}

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  return <span>{props.loaderData.user.username}</span>
}

export const Loading = () => {
  return <span>Loading...</span>
}
