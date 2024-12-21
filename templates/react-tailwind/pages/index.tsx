import { RouteProps } from 'ziro/react'
import { MetaFn } from 'ziro/router'

export const loader = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return fetch('https://api.github.com/repos/narixius/ziro-vite').then(res => res.json()) as Promise<{ description: string }>
}
export const meta: MetaFn<'/'> = async ctx => {
  return {
    title: 'Homepage',
    meta: [
      {
        name: 'description',
        content: ctx.loaderData.description,
      },
    ],
  }
}

export default function Index(props: RouteProps<'/'>) {
  return (
    <div className="min-w-screen min-h-screen bg-black text-white flex flex-col gap-2 items-center justify-center">
      <h1 className="font-bold text-3xl">Welcome to Ziro</h1>
      <p className="opacity-70">{props.loaderData.description}</p>
      <p className="opacity-70">Get started by editing pages/index.tsx</p>
    </div>
  )
}

export const Loading = () => {
  return <span>Loading...</span>
}
