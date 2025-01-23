import { Import } from 'unimport'

type PluginOptions<TConfig> = {
  registerRoutes?: (config: TConfig) => { routeId: string; filePath: string }[]
  registerImports?: (config: TConfig) => Import[]
}

type PluginBootstrapConfig = {
  configPath?: string
}

export class Plugin<TConfig> {
  constructor(public key: string, public options: PluginOptions<TConfig>, public bootstrapConfig: PluginBootstrapConfig) {}
  defineConfig(config: TConfig) {
    return config
  }
  extend(bootstrapConfig: PluginBootstrapConfig) {
    this.bootstrapConfig = bootstrapConfig
  }
}
