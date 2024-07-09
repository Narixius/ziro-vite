import { LoaderContext, MetaFunction, useLoaderData } from 'ziro/router'

export const meta: MetaFunction<'/blog/$id'> = ({ loaderData }) => {
  return [
    {
      title: loaderData.title,
    },
  ]
}

export const loader = async (ctx: LoaderContext<'/blog/$id'>) => {
  return (await fetch(`https://jsonplaceholder.typicode.com/posts/${ctx.params.id}`).then(r => r.json())) as { userId: number; id: number; title: string; body: string }
}

export default function PostPage() {
  const post = useLoaderData({
    from: '/blog/$id',
  })
  return (
    <div className="bg-red-300 flex flex-col">
      <span>Blog Post</span>
      <span>title: ${post.title}</span>
      <p>{post.body}</p>
    </div>
  )
}
