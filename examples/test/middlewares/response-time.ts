import { Middleware } from 'ziro2/router'

export const responseTimeMiddleware = new Middleware('Response Time Middleware', {
  async onRequest(ctx) {
    ctx.dataContext.responseTime = Date.now()
  },
  async onBeforeResponse(ctx) {
    const responseTime = Date.now() - ctx.dataContext.responseTime
    console.log(`Response Time: ${responseTime}ms`)
  },
})
