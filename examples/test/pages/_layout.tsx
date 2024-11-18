import { FC, PropsWithChildren } from 'react'
import { ErrorBoundaryProps, Link, Outlet, RouteProps } from 'ziro2/react'
import { MetaFn } from 'ziro2/router'

export default function MainLayout(props: RouteProps<'/_layout'>) {
  return <Outlet />
}

export const Layout: FC<PropsWithChildren> = props => {
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
        <Link href="/todo" className="underline text-blue-500">
          Todos
        </Link>
      </div>
      {props.children}
    </div>
  )
}

export const meta: MetaFn<'/_layout'> = async ({ loaderData }) => {
  return {
    title: `Root layout`,
  }
}

export const loader = async () => {
  return {}
}

export const Loading = () => {
  return <span>Loading root layout</span>
}

export const ErrorBoundary: FC<ErrorBoundaryProps> = props => {
  return <span>error in root layout "{props.error.message}"</span>
}
