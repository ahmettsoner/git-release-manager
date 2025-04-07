import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_TEMPLATE_PATH, LOCAL_TEMPLATE_PATH } from './constants'

export async function resolveTemplatePath(paramPath?: string, environment: string | null = null): Promise<string> {
    const envSuffix = environment ? `.${environment}` : ''

    if (paramPath) {
        const resolvedPath = path.resolve(paramPath.replace(/\.ejs$/, `${envSuffix}.ejs`))
        if (fs.existsSync(resolvedPath)) {
            return resolvedPath
        }
        // Fallback to default template if environment-specific template is not found
        const defaultParamPath = path.resolve(paramPath)
        if (fs.existsSync(defaultParamPath)) {
            return defaultParamPath
        }
        throw new Error(`Template file not found at: ${resolvedPath} or ${defaultParamPath}`)
    }

    const localTemplatePath = LOCAL_TEMPLATE_PATH.replace(/\.ejs$/, `${envSuffix}.ejs`)
    if (fs.existsSync(localTemplatePath)) {
        return localTemplatePath
    }

    if (fs.existsSync(LOCAL_TEMPLATE_PATH)) {
        return LOCAL_TEMPLATE_PATH
    }

    const defaultTemplatePath = DEFAULT_TEMPLATE_PATH.replace(/\.ejs$/, `${envSuffix}.ejs`)
    if (fs.existsSync(defaultTemplatePath)) {
        return defaultTemplatePath
    }

    if (fs.existsSync(DEFAULT_TEMPLATE_PATH)) {
        return DEFAULT_TEMPLATE_PATH
    }

    throw new Error('No valid template file found')
}
