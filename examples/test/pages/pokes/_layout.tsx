import { FC } from 'react'
import { ErrorComponentProps, LoaderProps, MetaFn, RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro/router/client'

export const meta: MetaFn<'/pokes'> = async options => {
  return {
    title: 'poks',
  }
}

export const loader = async (options: LoaderProps<'/pokes'>) => {
  options.dataContext
  return { blog: true }
}

export const ErrorComponent: FC<ErrorComponentProps> = ({ error, status }) => {
  return `${error.message}`
}

export default function PokesLayout(props: RouteProps<'/pokes/_layout'>) {
  return (
    <div>
      <p>Pokemons</p>
      <div className="flex gap-2">
        <Link href="/pokes/pikachu" className="text-blue-400 underline">
          Pikachu
        </Link>
        <Link href="/pokes/ditto" className="text-blue-400 underline">
          Ditto
        </Link>
        <Link href="/pokes/not-found-pokemon" className="text-blue-400 underline">
          invalid pokemon
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
