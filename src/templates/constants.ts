import path from 'path'

export const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, 'defaults/changelog.ejs')
export const LOCAL_TEMPLATE_PATH = path.resolve(process.cwd(), '.grm/templates/changelog.ejs')
