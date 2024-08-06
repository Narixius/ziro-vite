import { MetaFn, RouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export const meta: MetaFn<'/blog'> = async () => {
  return {
    title: 'poks',
  }
}

export default function BlogPage(props: RouteProps<'/blog'>) {
  return (
    <div>
      <p>Blogs</p>
      <Outlet />
    </div>
  )
}
