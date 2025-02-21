import { ChangelogCliArgs } from '../cli/types/ChangelogCliArgs'
import { VersionManager } from '../modules/version/VersionManager'
import { ChangelogValidator } from '../modules/changelog/ChangelogValidator'
import { readConfig } from '../config/configManager'
import { VersionCliArgs } from '../cli/types/VersionCliArgs'
import { BranchCliArgs } from '../cli/types/BranchCliArgs'
import { BranchController } from '../modules/branch/BranchController'
import { renderChangelogTemplate } from '../modules/changelog/templateOperations'
import { writeOutput } from '../modules/output/writer'
import { CommitCliArgs } from '../cli/types/CommitCliArgs'
import { CommitController } from '../modules/commit/CommitController'

export async function changelogRun(options: ChangelogCliArgs): Promise<void> {
    const validator = new ChangelogValidator()
    validator.validateOptions(options)

    if (options.mergeAll === undefined) {
        options.mergeAll = false
    }
    try {
        const config = await readConfig(options?.config, options.environment)
        let templatePath = options.template || config.template
        let outputOpt = options.output || config.output
        const fileData = await renderChangelogTemplate(templatePath, options, config)

        if (fileData) {
            writeOutput(fileData, outputOpt)
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}
export async function versionRun(options: VersionCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}

export async function branchRun(options: BranchCliArgs): Promise<void> {
    const controller = new BranchController()
    const config = await readConfig(options?.config, options.environment)
    await controller.handleCommand(options, config)
}

export async function commitRun(options: CommitCliArgs): Promise<void> {
    const config = await readConfig(options?.config, options.environment)
    const controller = new CommitController()
    await controller.handleCommand(options, config)
}

