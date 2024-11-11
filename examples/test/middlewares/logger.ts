import { Middleware } from 'ziro2/router'

const redBg = (str: string) => `\x1b[41m${str}\x1b[0m`
const blueBg = (str: string) => `\x1b[44m${str}\x1b[0m`
const greenBg = (str: string) => `\x1b[42m${str}\x1b[0m`

export const requestLogger = new Middleware('request-logger', {
  async onRequest(ctx) {
    ctx.dataContext.responseTime = Date.now()
  },
  async onBeforeResponse(ctx) {
    if (import.meta.env.SSR) {
      const responseTime = Date.now() - ctx.dataContext.responseTime
      const pathname = new URL(ctx.request.url).pathname
      const responseStatus = ctx.response.status
      console.log(`${(responseStatus > 399 ? redBg : greenBg)(String(responseStatus))} ${ctx.request.method} ${pathname}`)
    }
  },
})
