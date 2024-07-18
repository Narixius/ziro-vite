import { Outlet, useLoaderData } from '@tanstack/react-router'
import { LoaderFn } from 'ziro/router'

export const staleTime = 10_000
export const beforeLoad = async () => {
  return {
    user: (await fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json()))[0] as { id: number; name: string; email: string },
  }
}

export const loader: LoaderFn<'/blog/'> = async ({ context }) => {
  return {
    user: context.user,
  }
}

export default function BlogLayout() {
  const { user } = useLoaderData({
    from: '/blog',
  })

  return (
    <div className="flex flex-col">
      <span>Welcome {user.email}</span>
      <Outlet />
    </div>
  )
}
