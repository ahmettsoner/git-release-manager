import * as path from 'path'
import * as fs from 'fs'
import { Config } from './types/Config'
import { loadConfigFile } from './configLoader'
import { DEFAULT_CONFIG_PATH, LOCAL_CONFIG_PATH } from './constants'

export async function readConfig(customConfigPath: string | null = null, environment: string | null = null): Promise<Config> {
    const envSuffix = environment ? `.${environment}` : ''

    // Handle custom config path
    let finalCustomConfigPath = customConfigPath ? path.resolve(customConfigPath.replace(/\.json$/, `${envSuffix}.json`)) : null
    let customConfig = {}
    if (finalCustomConfigPath && fs.existsSync(finalCustomConfigPath)) {
        customConfig = await loadConfigFile(finalCustomConfigPath)
    }

    let localConfig = {}
    if (Object.keys(customConfig).length === 0) {
        // Only load local config if custom config is empty
        let finalLocalConfigPath = LOCAL_CONFIG_PATH.replace(/\.json$/, `${envSuffix}.json`)
        localConfig = fs.existsSync(finalLocalConfigPath) ? await loadConfigFile(finalLocalConfigPath) : {}
    }

    // Handle default config path
    let defaultConfigPath = DEFAULT_CONFIG_PATH.replace(/\.json$/, `${envSuffix}.json`)
    let defaultConfig = fs.existsSync(defaultConfigPath) ? await loadConfigFile(defaultConfigPath) : await loadConfigFile(DEFAULT_CONFIG_PATH)

    // Merge configurations with condition: default < (local if custom is empty) < custom
    const result = {
        ...defaultConfig,
        ...localConfig,
        ...customConfig,
    } as Config

    return result
}
