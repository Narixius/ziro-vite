import { RouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export default function BlogPage(props: RouteProps<'/blog/$cat'>) {
  return (
    <div>
      <p>Blogs</p>
      <p>{props.params.cat}</p>
      <Outlet />
    </div>
  )
}
