import { LoaderProps, MetaFn, RouteProps, ZiroRouteErrorComponent } from 'ziro/router'
import { abort } from 'ziro/router/abort'

export const loader = async ({ params, dataContext }: LoaderProps<'/blog/$pokemon'>) => {
  return await fetch(`https://pokeapi.co/api/v2/pokemon/${params.pokemon}`)
    .then(response => {
      if (response.ok) {
        return response.json()
      }
      abort(response.status, {
        message: "Couldn't load pokemon",
      })
    })
    .then(data => {
      return {
        sprites: {
          front_default: data.sprites.front_default as string,
        },
        name: data.name as string,
      }
    })
}

export const meta: MetaFn<'/blog/$pokemon'> = async ({ loaderData, dataContext }) => {
  return {
    title: loaderData.name,
  }
}

export default function SingleBlogPage({ params, loaderData, dataContext }: RouteProps<'/blog/$pokemon'>) {
  return (
    <div>
      <p>{loaderData.name}</p>
      <img src={loaderData.sprites.front_default} alt={loaderData.name} />
    </div>
  )
}

export const ErrorComponent: ZiroRouteErrorComponent = ({ error, resetErrorBoundary }) => {
  return (
    <div>
      <span className="text-red-800">{error.message} asdf</span>
    </div>
  )
}
