import { RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro2/react'

export const loader = async () => ({})

export default function MainLayout({ dataContext }: RouteProps<'/_layout'>) {
  return (
    <div>
      <div className="flex gap-2">
        <Link href="/" className="underline text-blue-500">
          Home
        </Link>
        <Link href="/pokes" className="underline text-blue-500">
          Pokes
        </Link>
        <Link href="/auth" className="underline text-blue-500">
          Login
        </Link>
        <Link href="/dashboard" className="underline text-blue-500">
          Dashboard
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
