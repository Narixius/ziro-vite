export const loader = async (ctx: any, pluginConfig: any) => {
  console.log(ctx)
  console.log(pluginConfig)
  return {
    foo: 'bar',
  }
}

export default function dashboardPage() {
  return <span>dashboard babyfasdf</span>
}

export const meta = async () => {
  return {
    title: 'dashboard',
  }
}
