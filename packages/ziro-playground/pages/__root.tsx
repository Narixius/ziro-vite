import { Body, Head, Html, Link, Meta, Outlet } from 'ziro/router'

export default function RootComponent() {
  return (
    <Html lang="en">
      <Head>
        <Meta />
      </Head>
      <Body>
        <Link to="/">Home</Link> <Link to="/blog">Blog</Link>{' '}
        <Link
          to="/blog/$slug"
          params={{
            slug: 'my-blog-post',
          }}
        >
          Blog Post
        </Link>{' '}
        <div>
          <Outlet />
        </div>
      </Body>
    </Html>
  )
}
