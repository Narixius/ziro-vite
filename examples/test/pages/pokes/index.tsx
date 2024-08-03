import { ZiroRouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export default function BlogPage(props: ZiroRouteProps<'/blog/$cat'>) {
  console.log('poks rendered')
  return (
    <div>
      <p>Blogs</p>
      <p>{props.params.cat}</p>
      <Outlet />
    </div>
  )
}
