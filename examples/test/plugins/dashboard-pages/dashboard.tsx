export const loader = async (ctx: any, pluginConfig: any) => {
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
