import { Outlet, useLoaderData } from 'ziro/router/client'

export default function BlogPage() {
  const loaderData = useLoaderData()
  return (
    <div>
      <p>Blogs</p>
      <p>time: {new Date(loaderData.time).toISOString()}</p>
      <Outlet />
    </div>
  )
}
