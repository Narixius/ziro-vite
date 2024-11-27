import { Plugin } from 'ziro/generator'

type User = {
  id: number | string
}

type Session = {
  id: string
  userId: User['id']
  expiresAt: Date
}

type Config = {
  loginPath: string
  dashboardPath: string
  protectedRoutes?: string[]
  cookieName?: string
  authenticate(email: string, password: string): Promise<User>
  createSession(token: string, userId: User['id']): Promise<Session>
  validateSessionToken(token: string): Promise<SessionValidationResult>
}

export type SessionValidationResult = { session: Session; user: User } | { session: null; user: null }

export const dashboard = new Plugin<Config>(
  'dashboard',
  {
    registerRoutes(config) {
      console.log(config)
      return [
        {
          routeId: config.dashboardPath || '/x-dashboard',
          filePath: new URL('./dashboard-pages/dashboard.tsx', import.meta.url).pathname,
        },
      ]
    },
  },
  {
    configName: 'dashboard',
    configPath: 'configs/dashboard',
  },
)
