import path from 'path'

export const DEFAULT_CONFIG_PATH = path.resolve(__dirname, 'defaults/config.json')
export const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), '.grm/config.json')
