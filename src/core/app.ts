import { VersionManager } from '../modules/version/VersionManager'
import { ChangelogValidator } from '../modules/changelog/ChangelogValidator'
import { readConfig } from '../config/configManager'
import { VersionCliArgs } from '../cli/types/VersionCliArgs'
import { renderChangelogTemplate } from '../modules/changelog/templateOperations'
import { writeOutput } from '../modules/output/writer'
import { CommitController } from '../modules/commit/CommitController'
import { CommitCreateCliArgs } from '../cli/types/CommitCreateCliArgs'
import { VersionInitCliArgs } from '../cli/types/VersionInitCliArgs'
import { VersionSetCliArgs } from '../cli/types/VersionSetCliArgs'
import { VersionRevertCliArgs } from '../cli/types/VersionRevertCliArgs'
import { VersionValidateCliArgs } from '../cli/types/VersionValidateCliArgs'
import { ChangelogGenerateCliArgs } from '../cli/types/ChangelogGenerateCliArgs'

export async function changelogRun(options: ChangelogGenerateCliArgs): Promise<void> {
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

export async function versionSetRun(options: VersionSetCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}
export async function versionRevertRun(options: VersionRevertCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}
export async function versionValidateRun(options: VersionValidateCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}
export async function versionInitRun(options: VersionInitCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}

export async function versionResetRun(options: VersionInitCliArgs): Promise<void> {
    const versionManager = new VersionManager()

    try {
        await versionManager.handleVersionCommand(options)
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
    }
}



export async function commitCreateRun(options: CommitCreateCliArgs): Promise<void> {
}

export async function commitListRun(options: CommitCreateCliArgs): Promise<void> {
    const config = await readConfig(options?.config, options.environment)
    const controller = new CommitController()
    await controller.handleListCommand(options, config)
}

export async function commitAmendRun(options: CommitCreateCliArgs): Promise<void> {
    const config = await readConfig(options?.config, options.environment)
    const controller = new CommitController()
    await controller.handleAmendCommand(options, config)
}

