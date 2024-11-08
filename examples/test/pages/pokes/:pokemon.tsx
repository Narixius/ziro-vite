import { ZiroRouteErrorComponent } from 'ziro/router'
import { RouteProps } from 'ziro2/react'
import { abort, LoaderArgs, MetaFn } from 'ziro2/router'

export const loader = async ({ params }: LoaderArgs<'/pokes/:pokemon'>) => {
  //   abort(400, 'Could not load pokemon')
  return await fetch(`https://pokeapi.co/api/v2/pokemon/${params.pokemon}`)
    .then(response => {
      if (response.ok) {
        return response.json()
      }
      throw abort(404, 'invalid pokemon')
    })
    .then(async data => {
      return {
        sprites: {
          front_default: data.sprites.front_default as string,
        },
        name: data.name as string,
      }
    })
}

export const Loading = () => {
  return 'loading pokemon...'
}

export const meta: MetaFn<'/pokes/:pokemon'> = async ({ loaderData }) => {
  return {
    title: loaderData.name,
  }
}

export default function SingleBlogPage({ loaderData }: RouteProps<'/pokes/:pokemon'>) {
  return (
    <div>
      <p>{loaderData.name}</p>
      <img src={loaderData.sprites.front_default} alt={loaderData.name} />
    </div>
  )
}

export const ErrorBoundary: ZiroRouteErrorComponent = ({ error, resetErrorBoundary }) => {
  return (
    <div>
      <span className="text-red-800">{error.message}</span>
    </div>
  )
}
