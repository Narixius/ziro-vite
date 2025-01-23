import { Plugin } from 'ziro/generator'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
      return [
        {
          routeId: config.dashboardPath || '/x-dashboard',
          filePath: new URL('./dashboard-pages/dashboard.tsx', import.meta.url).pathname,
        },
      ]
    },
    registerImports() {
      const __dirname = dirname(fileURLToPath(import.meta.url))
      return [
        {
          from: __dirname + '/imports.ts',
          name: 'useDashboard',
        },
      ]
    },
  },
  {
    configPath: 'configs/dashboard.ts',
  },
)
