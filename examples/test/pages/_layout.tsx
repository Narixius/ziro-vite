import { RouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export default function MainLayout({ dataContext }: RouteProps<'/_layout'>) {
  return (
    <div>
      <Outlet />
    </div>
  )
}
