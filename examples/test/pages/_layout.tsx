import { ErrorComponentProps, RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro/router/client'

export default function MainLayout({ dataContext }: RouteProps<'/pokes/_layout'>) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <Link to="/" className="text-blue-400 underline">
          Home page
        </Link>
        <Link href="/pokes" className="text-blue-400 underline">
          Pokes
        </Link>
      </div>
      <Outlet />
    </div>
  )
}

export function ErrorComponent({ error, status }: ErrorComponentProps) {
  return (
    <span>
      {status} {error.message}
    </span>
  )
}
