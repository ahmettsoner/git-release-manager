import * as ejs from 'ejs'
import * as fs from 'fs'
import { resolveTemplatePath } from './templateResolver'
import { Context } from '../modules/changes/types/Context'

export async function renderTemplate(templatePath: string, environment: string | null, data: Context): Promise<string> {
    const resolvedTemplatePath = await resolveTemplatePath(templatePath, environment)

    const templateContent = fs.readFileSync(resolvedTemplatePath, 'utf-8')
    const output = ejs.render(templateContent, { ...data })

    return output
}
