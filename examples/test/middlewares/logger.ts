import { Middleware } from 'ziro/router'

const redBg = (str: string) => `\x1b[41m${str}\x1b[0m`
const blueBg = (str: string) => `\x1b[44m${str}\x1b[0m`
const greenBg = (str: string) => `\x1b[48;5;22m${str}\x1b[0m`
const yellowBg = (str: string) => `\x1b[43;30m${str}\x1b[0m`
const red = (str: string) => `\x1b[31m${str}\x1b[0m`
const blue = (str: string) => `\x1b[94m${str}\x1b[0m`
const green = (str: string) => `\x1b[32m${str}\x1b[0m`
const cyan = (str: string) => `\x1b[36m${str}\x1b[0m`
const dim = (str: string) => `\x1b[2m${str}\x1b[0m`

const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '')

const getBgColor = (status: number) => {
  if (status >= 200 && status < 300) return greenBg
  if (status >= 300 && status < 400) return yellowBg
  if (status >= 400 && status < 500) return redBg
  return blueBg
}
const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET':
      return blue(method)
    case 'POST':
      return green(method)
    case 'DELETE':
      return red(method)
    case 'PATCH':
      return cyan(method)
    default:
      return method
  }
}

export const requestLogger = new Middleware('request-logger', {
  async onRequest(ctx) {
    ctx.dataContext.responseTime = Date.now()
  },
  async onBeforeResponse(ctx) {
    if (import.meta.env.SSR && !ctx.request.headers.get('X-ZIRO-Resolve-Remote-Data')) {
      const responseTime = Date.now() - ctx.dataContext.responseTime
      const pathname = new URL(ctx.request.url).pathname
      const responseStatus = ctx.response.status
      const LINE_WIDTH = process.stdout.columns - 1 || 50
      const logString = `${getMethodColor(ctx.request.method)} ${pathname} ${responseTime}ms ${getBgColor(responseStatus)(String(' ' + responseStatus + ' '))} `
      const dotsLength = Math.max(0, LINE_WIDTH - stripAnsi(logString).length)
      const dots = '.'.repeat(dotsLength)
      const log = `${getMethodColor(ctx.request.method)} ${pathname} ${dim(dots)} ${dim(responseTime + 'ms')} ${getBgColor(responseStatus)(String(' ' + responseStatus + ' '))} `
      console.log(log)
    }
  },
})
