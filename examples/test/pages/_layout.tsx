import { ErrorComponentProps, LoaderProps, RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro/router/client'

export default function MainLayout({ dataContext }: RouteProps<'/pokes/_layout'>) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <Link href="/" className="text-blue-400 underline">
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
  return `${status} ${error.message}`
}

export const loader = async (options: LoaderProps<'/pokes/_layout'>) => {
  return {
    x: 1.2,
  }
}
