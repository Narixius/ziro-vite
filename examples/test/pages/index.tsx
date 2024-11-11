import { MetaFn } from 'ziro2/router'

export const loader = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return {}
}

export const Loading = () => {
  return <span>Loading home page...</span>
}

export const meta: MetaFn<'/'> = async () => {
  return {
    title: 'Homepage',
  }
}

export default function Index() {
  return (
    <div>
      <h1>Home page</h1>
    </div>
  )
}
