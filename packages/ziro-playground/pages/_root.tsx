import { Body, Head, Html, Link, Meta, MetaFunction, Outlet } from 'ziro/router'
import '../styles.css'

export const meta: MetaFunction<'/'> = () => {
  return [
    {
      charSet: 'utf-8',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ]
}
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
