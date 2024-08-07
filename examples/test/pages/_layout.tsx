import { ErrorComponentProps, LoaderProps, RouteProps } from 'ziro/router'
import { Outlet } from 'ziro/router/client'

export default function MainLayout({ dataContext }: RouteProps<'layout:/pokes'>) {
  return <Outlet />
}
export function ErrorComponent({ error, status }: ErrorComponentProps) {
  return `${status} ${error.message}`
}

export const loader = async (options: LoaderProps<'layout:/pokes'>) => {
  return {
    x: 1.2,
  }
}
