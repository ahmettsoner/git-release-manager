import { BranchCliArgs } from '../../cli/types/BranchCliArgs';
import { BranchManager } from '../../modules/branch/BranchManager';

export class BranchController {
    private branchManager: BranchManager;

    constructor() {
        this.branchManager = new BranchManager();
    }

    async handleCommand(options: BranchCliArgs): Promise<void> {
        try {
            if (options.create) {
                await this.branchManager.createBranch(options.create, options.push)
            } else if (options.delete) {
                await this.branchManager.deleteBranch(options.delete)
            } else if (options.list) {
                await this.branchManager.listBranches()
            } else if (options.switch) {
                await this.branchManager.switchBranch(options.switch)
            } else if (options.merge) {
                await this.branchManager.mergeBranch(options.merge, options.push)
            } else if (options.release) {
                await this.branchManager.createReleaseBranch(options.release, options.push)
            } else if (options.hotfix) {
                await this.branchManager.createHotfixBranch(options.hotfix, options.push)
            } else if (options.feature) {
                await this.branchManager.createFeatureBranch(options.feature, options.push)
            } else if (options.finish) {
                await this.branchManager.finishBranch(options.finish, options.push)
            } else if (options.protect) {
                await this.branchManager.protectBranch(options.protect)
            } else if (options.unprotect) {
                await this.branchManager.unprotectBranch(options.unprotect)
            } else if (options.rebase) {
                await this.branchManager.rebaseBranch(options.rebase, options.push)
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