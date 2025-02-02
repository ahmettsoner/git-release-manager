import * as fs from 'fs'
import { Config } from './types/Config'

export async function loadConfigFile(filePath: string): Promise<Partial<Config>> {
    try {
        const configContent = await fs.promises.readFile(filePath, 'utf-8')
        const config = JSON.parse(configContent) as Partial<Config>

        // Convert helper functions from string to function
        if (config.helpers) {
            Object.keys(config.helpers).forEach(key => {
                const helperKey = key as keyof Config['helpers']
                if (typeof config.helpers![helperKey] === 'string') {
                    // eslint-disable-next-line no-eval
                    config.helpers![helperKey] = eval(`(${config.helpers![helperKey]})`)
                }
            })
        }

        return config
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {} // If the file is not found, return an empty object
        }
        throw error //Rethrow other errors
    }
}
