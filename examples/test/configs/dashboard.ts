import { dashboard } from '~/plugins/dashboard'

export const config = dashboard.defineConfig({
  cookieName: 'something',
  dashboardPath: '/cms/dashboard',
  loginPath: '/cms/login',
  async authenticate(email, password) {
    return {
      id: '123',
    }
  },
  async createSession(token, userId) {
    return {
      id: 'asdf',
      userId: 'adsf',
      expiresAt: new Date(),
    }
  },
  async validateSessionToken(token) {
    return {
      session: {
        id: 'asdf',
        userId: 'adsf',
        expiresAt: new Date(),
      },
      user: {
        id: 'asdf',
      },
    }
  },
})

export default config
