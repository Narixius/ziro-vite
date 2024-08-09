import { RouteProps } from 'ziro/router'

export default function Dashboard(props: RouteProps<'/dashboard'>) {
  return <span>{props.dataContext.user.name}</span>
}
