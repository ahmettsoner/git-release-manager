import { CommitCreateCliArgs } from '../../commands/commit/types/CommitCreateCliArgs'
import { CommitListCliArgs } from '../../commands/commit/types/CommitListCliArgs'
import { CliArgs } from '../../commands/types/CliArgs'
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
