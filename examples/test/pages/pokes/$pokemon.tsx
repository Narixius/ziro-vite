import { LoaderProps, MetaFn, RouteProps, ZiroRouteErrorComponent } from 'ziro/router'
import { abort } from 'ziro/router/abort'

export const loader = async ({ params }: LoaderProps<'/blog/$cat/$pokemon'>) => {
  return new Promise(async (resolve, reject) => {
    await fetch(`https://pokeapi.co/api/v2/pokemon/${params.pokemon}`)
      .then(response => {
        if (response.ok) {
          return response.json()
        }
        abort(response.status, {
          message: "Couldn't load pokemon",
        })
      })
      .then(
        // resolve,
        data => {
          setTimeout(() => resolve(data), 2000)
        },
        reject,
      )
  }) as Promise<{
    sprites: {
      front_default: string
    }
    name: string
  }>
}

export const meta: MetaFn<'/blog/$cat/$pokemon'> = async ({ params, loaderData, dataContext }) => {
  return {
    title: loaderData.name,
    titleTemplate(title) {
      return `${title} | ${dataContext.version}`
    },
  }
}

export default function SingleBlogPage({ params, loaderData, dataContext }: RouteProps<'/blog/$cat/$pokemon'>) {
  return (
    <div>
      <p>{params.cat}</p>
      <p>{loaderData.name}</p>
      <img src={loaderData.sprites.front_default} alt={loaderData.name} />
    </div>
  )
}

export const ErrorComponent: ZiroRouteErrorComponent = ({ error, resetErrorBoundary }) => {
  return (
    <div>
      <span className="text-red-800">{error.message}</span>
    </div>
  )
}
