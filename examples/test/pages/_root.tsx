import { Link, Outlet } from 'ziro/router/client'
import './styles.css'

export default function RootPage() {
  return (
    <div>
      <div className="flex gap-2">
        <Link href="/" className="text-blue-400 underline">
          Home page
        </Link>
        <Link href="/blog" className="text-blue-400 underline">
          blog
        </Link>
        <Link href="/blog/single" className="text-blue-400 underline">
          single post
        </Link>
        <Link href="/blog/twin" className="text-blue-400 underline">
          twin post
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
