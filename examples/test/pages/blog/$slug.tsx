import { useRoute } from 'ziro/router/client'

export default function SingleBlogPage() {
  const route = useRoute()

  return (
    <div>
      <p>Single Blog</p>
    </div>
  )
}
