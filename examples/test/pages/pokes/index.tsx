import { MetaFn } from 'ziro/router'

export default function PokesPage() {
  return <span>Pokes</span>
}

export const meta: MetaFn<'/pokes'> = async () => {
  return {
    title: 'pokes title',
  }
}
