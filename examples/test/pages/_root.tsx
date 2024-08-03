import { memo } from 'react'
import { Link, Outlet } from 'ziro/router/client'
import './styles.css'

const RootPage = memo(
  () => {
    console.log('root rendered')
    return (
      <div>
        <div className="flex gap-2">
          <Link href="/" className="text-blue-400 underline">
            Home page
          </Link>
          <Link href="/blog" className="text-blue-400 underline">
            blog
          </Link>
          <Link href="/blog/p/pikachu" className="text-blue-400 underline">
            Pikachu
          </Link>
          <Link href="/blog/x/ditto" className="text-blue-400 underline">
            Ditto
          </Link>
        </div>
        <Outlet />
      </div>
    )
  },
  (prev, next) => {
    return true
  },
)

export default RootPage
