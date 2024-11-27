import { MetaFn } from 'ziro/router'

export default function dashboardPage() {
  return <span>dashboard baby</span>
}

export const meta: MetaFn<'/x-dashboard'> = async () => {
  return {
    title: 'dashboard',
  }
}
