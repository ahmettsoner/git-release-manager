import { ChangelogCliArgs } from '../../cli/types/ChangelogCliArgs'
import { Config } from '../../config/types/Config'
import { writeOutput } from '../../modules/output/writer'
import { renderChangelogTemplate } from '../../modules/changelog/templateOperations'

export async function run(options: ChangelogCliArgs, config: Config): Promise<void> {
    let templatePath = options.template || config.template
    let outputOpt = options.output || config.output

    try {
        const fileData = await renderChangelogTemplate(templatePath, options, config)

        if (fileData) {
            writeOutput(fileData, outputOpt)
        }
    } catch (error) {
        console.error('Error getting git logs:', error)
        process.exit(1)
    }
}
