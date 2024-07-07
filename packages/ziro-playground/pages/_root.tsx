import { Body, Head, Html, Link, Meta, Outlet } from 'ziro/router'
import '../styles.css'

export default function RootComponent() {
  return (
    <Html lang="en">
      <Head>
        <Meta />
      </Head>
      <Body>
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-8 font-medium text-blue underline justify-center">
            <Link to="/">Home</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div>
            <Outlet />
          </div>
        </div>
      </Body>
    </Html>
  )
}
