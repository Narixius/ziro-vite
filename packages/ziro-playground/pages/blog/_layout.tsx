import { Outlet, useRouteContext } from '@tanstack/react-router'

export const beforeLoad = async () => {
  return {
    user: (await fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json()))[0] as { id: number; name: string; email: string },
  }
}

export default function BlogLayout() {
  const authUser = useRouteContext({
    from: '/blog',
  })

  return (
    <div className="flex flex-col">
      <span>Welcome {authUser.user.email}</span>
      <Outlet />
    </div>
  )
}
