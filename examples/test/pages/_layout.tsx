import { Outlet } from 'ziro/router/client'

export default function MainLayout() {
  return <Outlet />
}
export function ErrorComponent({ error }: any) {
  return `${error.getStatus()} ${error.message}`
}
