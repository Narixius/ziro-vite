import { LoaderProps, RouteProps } from 'ziro/router'
import { auth } from '../../middlewares/auth'

export const middlewares = [auth]

export const loader = async ({ dataContext }: LoaderProps<''>) => {
  return dataContext
}

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  return <span>{props.loaderData.user.name}</span>
}

export const Loading = () => {
  return <span>Loading...</span>
}
