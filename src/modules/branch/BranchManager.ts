import { simpleGit, SimpleGit } from 'simple-git'
import { GitVersionManager } from '../version/GitVersionManager'
import { Config } from '../../config/types/Config'

export class BranchManager {
    private readonly git: SimpleGit
    private readonly gitVersionManager: GitVersionManager

    constructor() {
        this.git = simpleGit()
        this.gitVersionManager = new GitVersionManager()
    }

    async createBranch(branchName: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        await this.git.checkoutLocalBranch(branchName)
        console.log(`Created and switched to branch '${branchName}' from '${currentBranch}'`)

        if (push) {
            await this.git.push('origin', branchName)
            console.log(`Pushed branch '${branchName}' to remote`)
        }
    }

    async deleteBranch(branchName: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        if (currentBranch === branchName) {
            throw new Error(`Cannot delete the current branch: ${branchName}`)
        }

        // Check if branch is protected
        if (await this.isBranchProtected(branchName)) {
            throw new Error(`Cannot delete protected branch: ${branchName}`)
        }

        await this.git.deleteLocalBranch(branchName, true)
        console.log(`Deleted branch '${branchName}'`)

        if (push) {
        try {
            await this.git.push(['origin', '--delete', branchName])
            console.log(`Deleted remote branch '${branchName}'`)
        } catch (error) {
            console.log(`Note: Remote branch '${branchName}' doesn't exist or already deleted`)
        }
    }
    }
    async listBranches(): Promise<void> {
        const branchSummary = await this.git.branch(['-a'])
        const currentBranch = branchSummary.current
        const protectedBranches = await this.getProtectedBranches()

        console.log('\nBranches:')
        console.log('=========')

        // Local branches
        console.log('\nLocal branches:')
        branchSummary.all
            .filter(branch => !branch.includes('remotes/'))
            .forEach(branch => {
                const isCurrent = branch === currentBranch
                const isProtected = protectedBranches.includes(branch)
                console.log(`${isCurrent ? '* ' : '  '}${branch}${isProtected ? ' (protected)' : ''}`)
            })

        // Remote branches
        console.log('\nRemote branches:')
        branchSummary.all
            .filter(branch => branch.includes('remotes/'))
            .map(branch => branch.replace('remotes/', ''))
            .forEach(branch => {
                console.log(`  ${branch}`)
            })
    }

    async switchBranch(branchName: string): Promise<void> {
        await this.git.checkout(branchName)
        console.log(`Switched to branch '${branchName}'`)
    }

    async mergeBranch(branchName: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()

        if (await this.isBranchProtected(currentBranch)) {
            const confirmation = await this.confirmAction(`Warning: You're merging into protected branch '${currentBranch}'. Continue?`)
            if (!confirmation) {
                console.log('Merge cancelled')
                return
            }
        }

        await this.git.merge([branchName])
        console.log(`Merged '${branchName}' into '${currentBranch}'`)

        if (push) {
            await this.git.push('origin', currentBranch)
            console.log(`Pushed changes to remote '${currentBranch}'`)
        }
    }

    async createReleaseBranch(version: string, push?: boolean): Promise<void> {
        const branchName = `release/${version}`
        await this.createBranch(branchName, push)
        await this.protectBranch(branchName)
        console.log(`Created protected release branch '${branchName}'`)
    }

    async createHotfixBranch(version: string, push?: boolean): Promise<void> {
        const branchName = `hotfix/${version}`
        await this.createBranch(branchName, push)
        console.log(`Created hotfix branch '${branchName}'`)
    }

    async createFeatureBranch(name: string, push?: boolean): Promise<void> {
        const branchName = `feature/${name}`
        await this.createBranch(branchName, push)
        console.log(`Created feature branch '${branchName}'`)
    }

    async finishBranch(config: Config, branchName?: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch();
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch;

        // Ensure the branch exists
        const branches = await this.git.branchLocal();
        if (!branches.all.includes(activeBranch)) {
            console.log(`The branch ${branchName} does not exist.`);
            return;
        }

        const gitVersionManager = new GitVersionManager();

        // Determine the branch type from the name
        const branchType = activeBranch.split('/')[0];
        const branchConfig = config.branchStrategies[branchType];

        if (!branchConfig) {
            console.log(`No configuration found for branch type: ${branchType}`);
            return;
        }

        // Merge into base branches as per the configuration
        for (const baseBranch of branchConfig.baseBranches) {
            console.log(`Attempting to merge ${activeBranch} into ${baseBranch}`);
            await this.git.checkout(baseBranch);
            await this.mergeBranch(activeBranch, push);
        }

        // Create a tag if required by the configuration
        if (branchConfig.createTag) {
            const version = activeBranch.replace(`${branchType}/`, '');
            const formattedVersion = version.startsWith(branchConfig.tagPrefix ?? '')
                ? version
                : `${branchConfig.tagPrefix ?? ''}${version}`;

            const tagName = `${formattedVersion}`;
            await gitVersionManager.createGitTag(tagName);
        }

        // Delete the branch after merge if specified by the configuration
        if (branchConfig.deleteAfterMerge) {
            if(activeBranch == currentBranch){
                this.switchBranch(branchConfig.baseBranches[0])
            }
            await this.deleteBranch(activeBranch);
            console.log(`Finished and cleaned up branch '${activeBranch}'`);
        }
    }

    async protectBranch(branchName?: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch();
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch;

        const protectedBranches = await this.getProtectedBranches()
        if (!protectedBranches.includes(activeBranch)) {
            protectedBranches.push(activeBranch)
            await this.saveProtectedBranches(protectedBranches)
            console.log(`Protected branch '${activeBranch}'`)
        }
    }

    async unprotectBranch(branchName?: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch();
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch;

        const protectedBranches = await this.getProtectedBranches()
        const index = protectedBranches.indexOf(activeBranch)
        if (index > -1) {
            protectedBranches.splice(index, 1)
            await this.saveProtectedBranches(protectedBranches)
            console.log(`Removed protection from branch '${activeBranch}'`)
        }
    }

    async rebaseBranch(branchName: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch();

        await this.git.rebase([branchName]);
        console.log(`Rebased '${currentBranch}' with '${branchName}'`)

        if (push) {
            await this.git.push('origin', currentBranch, ['--force'])
            console.log(`Force pushed rebased changes to '${currentBranch}'`)
        }
    }

    async syncBranch(push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        await this.git.pull('origin', currentBranch, ['--rebase'])
        console.log(`Synced '${currentBranch}' with remote`)

        if (push) {
            await this.git.push('origin', currentBranch)
            console.log(`Pushed local changes to remote '${currentBranch}'`)
        }
    }

    private async getCurrentBranch(): Promise<string> {
        const branchSummary = await this.git.branch()
        return branchSummary.current
    }

    private async isBranchProtected(branchName: string): Promise<boolean> {
        const protectedBranches = await this.getProtectedBranches()
        return protectedBranches.includes(branchName)
    }

    private async getProtectedBranches(): Promise<string[]> {
        try {
            const config = await this.git.listConfig()
            const protectedBranchesConfig = config.all['branch.protected']

            // If it's already an array, return it
            if (Array.isArray(protectedBranchesConfig)) {
                return protectedBranchesConfig
            }

            // If it's a string, parse it
            if (typeof protectedBranchesConfig === 'string') {
                return JSON.parse(protectedBranchesConfig)
            }

            // If it's undefined or null, return default
            return []
        } catch {
            return []
        }
    }

    private async saveProtectedBranches(branches: string[]): Promise<void> {
        await this.git.addConfig('branch.protected', JSON.stringify(branches))
    }

    private async confirmAction(message: string): Promise<boolean> {
        // Implementation depends on your preferred CLI interaction library
        // For example, using 'inquirer'
        return true // Placeholder
    }
}
