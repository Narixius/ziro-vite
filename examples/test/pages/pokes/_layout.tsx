import { RouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export default function PoksLayout(props: RouteProps<'/blog'>) {
  return (
    <div>
      <p>Pokes Layout</p>
      <Outlet />
    </div>
  )
}
