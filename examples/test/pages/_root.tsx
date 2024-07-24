import { Outlet } from 'ziro/router/client'

export default function RootPage() {
  return (
    <div>
      <p>Root</p>
      <Outlet />
    </div>
  )
}
