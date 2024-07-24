import { Link, Outlet } from 'ziro/router/client'

export default function RootPage() {
  console.log('root rendered')
  return (
    <div>
      <div className="flex gap-2">
        <Link href="/">Home page</Link>
        <Link href="/blog">blog</Link>
        <Link href="/blog/single">post</Link>
      </div>
      <p>Root</p>
      <Outlet />
    </div>
  )
}
