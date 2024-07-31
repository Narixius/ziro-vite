import { ZiroRouteProps } from 'ziro/router'

export default function SingleBlogPage({ params, loaderData }: ZiroRouteProps<'/blog/$slug'>) {
  return (
    <div>
      <p>Single Blog</p>
      <span>{loaderData.ok}</span>
      <span>{params.slug}</span>
    </div>
  )
}
