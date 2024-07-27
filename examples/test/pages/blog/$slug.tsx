import { ZiroRouteProps } from 'ziro/router'

export default function SingleBlogPage({ params, loaderData }: ZiroRouteProps) {
  return (
    <div>
      <p>Single Blog</p>
      <span>{params!.slug}</span>
    </div>
  )
}
