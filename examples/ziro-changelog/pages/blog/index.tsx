import { Link, MetaFunction, useLoaderData } from 'ziro/router'

export const meta: MetaFunction<'/blog/'> = () => {
  return [
    {
      title: 'Z۰ro Blog',
    },
  ]
}

export const loader = async () => {
  return (await fetch('https://jsonplaceholder.typicode.com/posts').then(r => r.json())) as { userId: number; id: number; title: string; body: string }[]
}

export default function Blog() {
  const posts = useLoaderData({
    from: '/blog/',
  })
  return (
    <div className="flex flex-col">
      <span className="mt-6 mb-2">Blogs Posts:</span>
      {posts.map(post => {
        return (
          <Link
            key={post.id}
            className="text-blue-500"
            to="/blog/$id"
            params={{
              id: String(post.id),
            }}
          >
            {post.title}
          </Link>
        )
      })}
    </div>
  )
}
