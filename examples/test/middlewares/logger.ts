import { Middleware } from 'ziro2/router'

const redBg = (str: string) => `\x1b[41m${str}\x1b[0m`
const blueBg = (str: string) => `\x1b[44m${str}\x1b[0m`
const greenBg = (str: string) => `\x1b[42m${str}\x1b[0m`
const yellowBg = (str: string) => `\x1b[43m${str}\x1b[0m`

const getBgColor = (status: number) => {
  if (status >= 200 && status < 300) return greenBg
  if (status >= 300 && status < 400) return yellowBg
  if (status >= 400 && status < 500) return redBg
  return blueBg
}

export const requestLogger = new Middleware('request-logger', {
  async onRequest(ctx) {
    ctx.dataContext.responseTime = Date.now()
  },
  async onBeforeResponse(ctx) {
    if (import.meta.env.SSR) {
      const responseTime = Date.now() - ctx.dataContext.responseTime
      const pathname = new URL(ctx.request.url).pathname
      const responseStatus = ctx.response.status
      const LINE_WIDTH = process.stdout.columns || 50
      const logString = `${ctx.request.method} ${pathname} ${responseTime}ms ${getBgColor(responseStatus)(String(' ' + responseStatus + ' '))} `
      const dotsLength = Math.max(0, LINE_WIDTH - logString.length)
      const dots = '.'.repeat(dotsLength)
      const log = `${ctx.request.method} ${pathname} ${dots} ${responseTime}ms ${getBgColor(responseStatus)(String(' ' + responseStatus + ' '))} `
      console.log(log)
    }
  },
})
