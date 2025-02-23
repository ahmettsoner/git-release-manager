import { CliArgs } from '../../cli/types/CliArgs'
import { CommitCliArgs } from '../../cli/types/CommitCliArgs'
import { CommitCreateCliArgs } from '../../cli/types/CommitCreateCliArgs'
import { CommitListCliArgs } from '../../cli/types/CommitListCliArgs'
import { Config } from '../../config/types/Config'
import { CommitManager } from './CommitManager'

export class CommitController {
    private readonly commitManager: CommitManager

    constructor() {
        this.commitManager = new CommitManager()
    }

    async handleListCommand(options: CommitListCliArgs, config: Config): Promise<void> {
        try {
            await this.commitManager.listCommits(options, config)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }

    async handleCreateCommand(options: CommitCreateCliArgs, config: Config): Promise<void> {
        try {
            // Staging logic if provided
            if (options.all) {
                await this.commitManager.stageAll()
            } else if (options.file) {
                await this.commitManager.stageFiles(options.file)
            }

            // After staging, perform the commit
            await this.commitManager.createCommit(options, config)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }
    async handleAmendCommand(options: CliArgs, config: Config): Promise<void> {
        try {
            // await this.commitManager.listCommits(options, config)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }
}
