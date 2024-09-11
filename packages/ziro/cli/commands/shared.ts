import { colors } from 'consola/utils'
import { App as H3App } from 'h3'
import { Listener } from 'listhen'
import { ViteDevServer } from 'vite'
import { ZiroRouter } from '../../router'

export const sharedContext = {
  version: 'N/A',
}

export const printZiroHeader = () => {
  console.log(`  ${colors.bold('Z۰RO')} ${colors.dim(`v${sharedContext.version}`)} ${colors.dim(`[Development]`)}`)
}

interface IAppContext {
  version: string
  router: ZiroRouter
  h3: H3App
  listener: Listener
  vite: ViteDevServer
}

export class AppContext {
  public context: IAppContext | {} = {}

  private static instance: AppContext

  private constructor() {}

  public static getContext(): IAppContext {
    if (!AppContext.instance) {
      AppContext.instance = new AppContext()
    }
    return AppContext.instance.context as IAppContext
  }
}
