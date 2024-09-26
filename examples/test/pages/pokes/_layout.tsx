import { FC } from 'react'
import { ErrorComponentProps, LoaderProps, RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro/router/client'

export const meta = async () => {
  return {
    title: 'poks',
  }
}

export const loader = async (options: LoaderProps<'/pokes/_layout'>) => {
  const samplePokemons = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=4&offset=${Math.floor(Math.random() * 16)}`).then(r => r.json())
  return { pokemons: (samplePokemons.results as { name: string }[]).map(r => r.name) } as { pokemons: string[] }
}

export const ErrorComponent: FC<ErrorComponentProps> = ({ error, status }) => {
  return `${error.message}`
}

export const Loading = () => {
  return 'loading...'
}

export default function PokesLayout(props: RouteProps<'/pokes/_layout'>) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2">
        <Link to="/" className="text-blue-400 underline">
          Home page
        </Link>
        <Link
          to="/pokes/:pokemon"
          params={{
            pokemon: 'yo',
          }}
          className="text-blue-400 underline"
        >
          Pokes
        </Link>
        <Link href="/dashboard" className="text-blue-400 underline">
          Dashboard
        </Link>
      </div>
      <div>
        <p>Pokemons</p>
        <div className="flex gap-2">
          {props.loaderData.pokemons.map(pokemon => {
            return (
              <Link to="/pokes/:pokemon" key={pokemon} params={{ pokemon }} className="text-blue-400 underline">
                {pokemon}
              </Link>
            )
          })}

          <Link href="/pokes/not-found-pokemon" className="text-blue-400 underline">
            invalid pokemon
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
