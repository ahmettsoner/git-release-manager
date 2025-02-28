import { BranchCliArgs } from '../../commands/branch/types/BranchCliArgs';
import { BranchCreateCliArgs } from '../../commands/branch/types/BranchCreateCliArgs';
import { BranchDeleteCliArgs } from '../../commands/branch/types/BranchDeleteCliArgs';
import { BranchListCliArgs } from '../../commands/branch/types/BranchListCliArgs';
import { BranchMergeCliArgs } from '../../commands/branch/types/BranchMergeCliArgs';
import { BranchProtectCliArgs } from '../../commands/branch/types/BranchProtectCliArgs';
import { BranchRebaseCliArgs } from '../../commands/branch/types/BranchRebaseCliArgs';
import { BranchSwitchCliArgs } from '../../commands/branch/types/BranchSwitchCliArgs';
import { Config } from '../../config/types/Config';
import { BranchManager } from '../../modules/branch/BranchManager';

export class BranchController {
    private readonly branchManager: BranchManager;

    constructor() {
        this.branchManager = new BranchManager();
    }
    async handleCreateCommand(options: BranchCreateCliArgs): Promise<void> {
        // const config = await readConfig(options?.config, options.environment)
        try {
            if (options.name) {
                await this.branchManager.createBranch(options.name, options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async handleDeleteCommand(options: BranchDeleteCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.deleteBranch(options.name, options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async handleMergeCommand(options: BranchMergeCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.mergeBranch(options.name, options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async handleRebaseCommand(options: BranchRebaseCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.rebaseBranch(options.name, options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
    async handleSwitchCommand(options: BranchSwitchCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.switchBranch(options.name)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
    async handleProtectCommand(options: BranchProtectCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.protectBranch(options.name)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
    async handleUnProtectCommand(options: BranchProtectCliArgs): Promise<void> {
        try {
            if (options.name) {
                await this.branchManager.unprotectBranch(options.name)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
    async handleListCommand(options: BranchListCliArgs): Promise<void> {
        try {
            await this.branchManager.listBranches()
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }


    async handleCommand(options: BranchCliArgs, config: Config): Promise<void> {
        try {
            if (options.create) {
            //     await this.branchManager.createBranch(options.create, options.push)
            // } else if (options.delete) {
            //     await this.branchManager.deleteBranch(options.delete)
            } else if (options.list) {
                // await this.branchManager.listBranches()
            } else if (options.switch) {
                // await this.branchManager.switchBranch(options.switch)
            } else if (options.merge) {
                // await this.branchManager.mergeBranch(options.merge, options.push)
            } else if (options.release) {
                await this.branchManager.createReleaseBranch(options.release, options.push)
            } else if (options.hotfix) {
                await this.branchManager.createHotfixBranch(options.hotfix, options.push)
            } else if (options.feature) {
                await this.branchManager.createFeatureBranch(options.feature, options.push)
            } else if (options.finish) {
                await this.branchManager.finishBranch(config, options.finish, options.push)
            } else if (options.protect) {
                // await this.branchManager.protectBranch(options.protect)
            } else if (options.unprotect) {
                // await this.branchManager.unprotectBranch(options.unprotect)
            } else if (options.rebase) {
                // await this.branchManager.rebaseBranch(options.rebase, options.push)
            } else if (options.sync) {
                await this.branchManager.syncBranch(options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
}