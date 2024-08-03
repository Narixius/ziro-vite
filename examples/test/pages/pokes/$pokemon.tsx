import { ZiroLoaderProps, ZiroMetaProps, ZiroRouteErrorComponent, ZiroRouteProps } from 'ziro/router'
import { abort } from 'ziro/router/abort'

export const loader = async ({
  params,
}: ZiroLoaderProps<'/blog/$cat/$pokemon'>): Promise<{
  sprites: {
    front_default: string
  }
  name: string
}> => {
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
  })
}

export const meta = async ({ params }: ZiroMetaProps<'/blog/$cat/$pokemon'>) => {
  return {
    title: params.pokemon,
  }
}

export default function SingleBlogPage({ params, loaderData }: ZiroRouteProps<'/blog/$cat/$pokemon'>) {
  console.log('pokemon rendered')
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
