import { ZiroLoaderProps, ZiroMetaProps, ZiroRouteErrorComponent, ZiroRouteProps } from 'ziro/router'
import { abort } from 'ziro/router/abort'

export const loader = async ({ params, dataContext }: ZiroLoaderProps<'/blog/$slug'>) => {
  abort(403, {
    message: 'The post not found',
  })
  return {
    ok: true,
  }
}

export const meta = async ({ params }: ZiroMetaProps<'/blog/$slug'>) => {
  return {
    title: params.slug,
  }
}

export default function SingleBlogPage({ params, loaderData }: ZiroRouteProps<'/blog/$slug'>) {
  return (
    <div>
      <p>Single Blog</p>
      <span>{loaderData.ok}</span>
      <span>{params.slug}</span>
    </div>
  )
}

export const ErrorComponent: ZiroRouteErrorComponent = ({ error }) => {
  return error.message
}
