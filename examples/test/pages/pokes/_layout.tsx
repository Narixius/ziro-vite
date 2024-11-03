import { LoaderCircleIcon } from 'lucide-react'
import { FC } from 'react'
import { ErrorComponentProps, RouteProps } from 'ziro/router'
import { Link, Outlet } from 'ziro2/react'
import { LoaderArgs, MetaFn } from 'ziro2/router'
export const meta: MetaFn<'/_layout'> = async () => {
  return {
    title: 'poks',
  }
}

export const loader = async (options: LoaderArgs<'/pokes/_layout'>) => {
  const samplePokemons = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=4&offset=${Math.floor(Math.random() * 16)}`).then(r => r.json())
  //   await new Promise(resolve => setTimeout(resolve, 5000))
  return { pokemons: (samplePokemons.results as { name: string }[]).map(r => r.name) } as { pokemons: string[] }
}

export const ErrorBoundary: FC<ErrorComponentProps> = ({ error, status }) => {
  return `${error.message}`
}

export const Loading = () => {
  return <LoaderCircleIcon className="animate-spin" />
}

export default function PokesLayout(props: RouteProps<'/pokes/_layout'>) {
  return (
    <div className="flex flex-col">
      <div>
        <p>Pokemons</p>
        <div className="flex gap-2">
          {props.loaderData.pokemons.map((pokemon: any) => {
            return (
              <Link href={`/pokes/${pokemon}`} key={pokemon} className="text-blue-400 underline">
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
