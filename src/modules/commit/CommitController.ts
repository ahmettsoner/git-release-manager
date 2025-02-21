import { CommitCliArgs } from '../../cli/types/CommitCliArgs';
import { Config } from '../../config/types/Config';
import { CommitManager } from './CommitManager';

export class CommitController {
    private readonly commitManager: CommitManager;

    constructor() {
        this.commitManager = new CommitManager();
    }

    async handleCommand(options: CommitCliArgs, config: Config): Promise<void> {
        try {
            if (options.list) {
                await this.commitManager.listCommits(options, config)
            } else {
                await this.commitManager.createCommit(options, config)
            }

        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
}