import { Outlet } from 'ziro/router/client'

export default function BlogPage() {
  return (
    <div>
      <p>Blogs</p>
      <Outlet />
    </div>
  )
}
