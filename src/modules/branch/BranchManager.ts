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

    async createBranch(branchName: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        await this.git.checkoutLocalBranch(branchName)
        console.log(`Created and switched to branch '${branchName}' from '${currentBranch}'`)
    }

    async deleteBranch(branchName: string): Promise<void> {
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
    }

    async listBranches(config: Config, remote?: boolean | string): Promise<void> {
        const branchSource = typeof remote === 'boolean' ? config.repository.remote.default : remote
        let localBranches: string[] = []
        let remoteBranches: string[] = []

        // Fetch branch information based on remote setting
        if (branchSource) {
            // Fetch branches from the specified remote or default remote
            await this.git.fetch(branchSource)
            const fetchedRemoteBranches = await this.git.branch(['-r'])
            remoteBranches = fetchedRemoteBranches.all.filter(branch => branch.startsWith(`remotes/${branchSource}/`))
        } else {
            // Retrieve all branches for both local and remotes when no specific remote is specified
            const branchSummary = await this.git.branch(['-a'])
            localBranches = branchSummary.all.filter(branch => !branch.includes('remotes/'))
            remoteBranches = branchSummary.all.filter(branch => branch.includes('remotes/'))
        }

        // Output branches in requested format
        if (!branchSource) {
            // Print local branches if no remote is explicitly specified
            console.log('\nLocal:')
            localBranches.forEach(branch => console.log(`  ${branch}`))
        }

        // Group remote branches by their specific remote name and print
        const groupedRemoteBranches: Record<string, string[]> = {}
        remoteBranches.forEach(branch => {
            const branchInfo = branch.replace('remotes/', '').split('/')
            const remoteName = branchInfo[0]
            const branchName = branchInfo.slice(1).join('/')
            if (!groupedRemoteBranches[remoteName]) {
                groupedRemoteBranches[remoteName] = []
            }
            groupedRemoteBranches[remoteName].push(branchName)
        })

        Object.entries(groupedRemoteBranches).forEach(([remoteName, branches]) => {
            console.log(`\n${remoteName}:`)
            branches.forEach(branch => console.log(`  ${branch}`))
        })
    }

    async switchBranch(branchName: string): Promise<void> {
        await this.git.checkout(branchName)
        console.log(`Switched to branch '${branchName}'`)
    }

    async mergeBranch(config: Config, branchName: string, squash?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()

        try {
            await this.git.fetch()

            // Determine if squash is requested and merge accordingly
            if (squash) {
                // Perform a squash merge
                await this.git.raw(['merge', '--squash', branchName])
                await this.git.commit(`Squashed merge of '${branchName}' into '${currentBranch}'`)
                console.log(`Squashed '${branchName}' into '${currentBranch}'`)
            } else {
                // Perform a regular merge
                await this.git.merge([branchName])
                console.log(`Merged '${branchName}' into '${currentBranch}'`)
            }
        } catch (error) {
            console.error(`Failed to complete merge or push operation:`, error)
        }
    }

    async rebaseBranch(config: Config, branchName: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch()


        try {
            await this.git.fetch()

            // Rebase from either remote or local branch
            await this.git.rebase([branchName])
            console.log(`Rebased '${currentBranch}' with '${branchName}'`)

        } catch (error) {
            console.error(`Failed to complete rebase or push operation:`, error)
        }
    }

    async protectBranch(branchName?: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch

        const protectedBranches = await this.getProtectedBranches()
        if (!protectedBranches.includes(activeBranch)) {
            protectedBranches.push(activeBranch)
            await this.saveProtectedBranches(protectedBranches)
            console.log(`Protected branch '${activeBranch}'`)
        }
    }

    async unprotectBranch(branchName?: string): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch

        const protectedBranches = await this.getProtectedBranches()
        const index = protectedBranches.indexOf(activeBranch)
        if (index > -1) {
            protectedBranches.splice(index, 1)
            await this.saveProtectedBranches(protectedBranches)
            console.log(`Removed protection from branch '${activeBranch}'`)
        }
    }

    async syncBranch(config: Config, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        await this.git.pull(config.repository.remote.default, currentBranch, ['--rebase'])
        console.log(`Synced '${currentBranch}' with remote`)

        if (push) {
            await this.git.push(config.repository.remote.default, currentBranch)
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

    async createReleaseBranch(config: Config, version: string, push?: boolean): Promise<void> {
        const branchName = `release/${version}`
        await this.createBranch(branchName)
        await this.protectBranch(branchName)
        console.log(`Created protected release branch '${branchName}'`)
    }

    async createHotfixBranch(config: Config, version: string, push?: boolean): Promise<void> {
        const branchName = `hotfix/${version}`
        await this.createBranch(branchName)
        console.log(`Created hotfix branch '${branchName}'`)
    }

    async createFeatureBranch(config: Config, name: string, push?: boolean): Promise<void> {
        const branchName = `feature/${name}`
        await this.createBranch(branchName)
        console.log(`Created feature branch '${branchName}'`)
    }

    async finishBranch(config: Config, branchName?: string, push?: boolean): Promise<void> {
        const currentBranch = await this.getCurrentBranch()
        const activeBranch = typeof branchName === 'string' && branchName.trim() !== '' ? branchName : currentBranch

        // Ensure the branch exists
        const branches = await this.git.branchLocal()
        if (!branches.all.includes(activeBranch)) {
            console.log(`The branch ${branchName} does not exist.`)
            return
        }

        const gitVersionManager = new GitVersionManager()

        // Determine the branch type from the name
        const branchType = activeBranch.split('/')[0]
        const branchConfig = config.branchStrategies[branchType]

        if (!branchConfig) {
            console.log(`No configuration found for branch type: ${branchType}`)
            return
        }

        // Merge into base branches as per the configuration
        for (const baseBranch of branchConfig.baseBranches) {
            console.log(`Attempting to merge ${activeBranch} into ${baseBranch}`)
            await this.git.checkout(baseBranch)
            await this.mergeBranch(config, activeBranch, push)
        }

        // Create a tag if required by the configuration
        if (branchConfig.createTag) {
            const version = activeBranch.replace(`${branchType}/`, '')
            const formattedVersion = version.startsWith(branchConfig.tagPrefix ?? '') ? version : `${branchConfig.tagPrefix ?? ''}${version}`

            const tagName = `${formattedVersion}`
            await gitVersionManager.createGitTag(tagName)
        }

        // Delete the branch after merge if specified by the configuration
        if (branchConfig.deleteAfterMerge) {
            if (activeBranch == currentBranch) {
                this.switchBranch(branchConfig.baseBranches[0])
            }
            await this.deleteBranch(activeBranch)
            console.log(`Finished and cleaned up branch '${activeBranch}'`)
        }
    }
}
