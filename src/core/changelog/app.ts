import { ChangelogCliArgs } from '../../cli/types/ChangelogCliArgs'
import { Config } from '../../config/types/Config'
import { writeOutput } from '../../modules/output/writer'
import { renderChangelogTemplate } from '../../modules/changelog/templateOperations'
import { VersionCliArgs } from '../../cli/types/VersionCliArgs'
import { VersionManager } from '../../modules/version/VersionManager'

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
export async function runVersion(options: VersionCliArgs): Promise<void> {
    const versionManager = new VersionManager();
    
    try {
        await versionManager.handleVersionCommand(options);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}