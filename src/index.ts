#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CliArgs } from './cli/types/CliArgs'
import { ChangelogCliArgs } from './cli/types/ChangelogCliArgs'
import { PackageJson } from './types/PackageJson'
import { run as changelogRun, runVersion } from './core/changelog/app'
import { readConfig } from './config/configManager'

// Read package.json
const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
    .name(packageJson.name ?? 'changelog')
    .description(packageJson.description ?? 'Changelog generator tool')
    .version(packageJson.version ?? '0.0.0', '-v, --version', 'Show version number')
    .helpOption('-h, --help', 'Show help information')

const validateOptions = (options: ChangelogCliArgs) => {
    const hasRange = !!options.range
    const hasPoint = !!options.point
    const hasFromOrTo = !!options.from || !!options.to

    if (hasRange && (hasPoint || hasFromOrTo)) {
        console.error(`Error: The '--range' option cannot be used with '--from', '--to', or '--point'.`)
        process.exit(1)
    }

    if (hasPoint && (hasRange || hasFromOrTo)) {
        console.error(`Error: The '--point' option cannot be used with '--range', '--from', or '--to'.`)
        process.exit(1)
    }

    if (hasFromOrTo && (hasRange || hasPoint)) {
        console.error(`Error: '--from' and '--to' options cannot be used with '--range' or '--point'.`)
        process.exit(1)
    }
}

program // generate ai based conventional commit
    .command('commit')
    .description('Generate changelog')
    .action(async (options: CliArgs) => {})

program
    .command('changelog')
    .description('Generate changelog')
    .option('--from <commit | tag | branch| date | reference>', 'Specify starting reference')
    .option('--to <commit | tag | branch| date | reference>', 'Specify ending reference')
    .option('--point <commit | tag | branch| date | reference>', 'Specify a single reference')
    .option('--range <commit | tag | branch| date | reference>', 'Specify reference range')
    .option('--mergeAll [boolean]', 'Merge all changes into one output')
    .option('--config [string]', 'Custom config file path')
    .option('--template [string]', 'Custom template file path')
    .option('--output [string]', 'Custom Output file path')
    .option('--environment [string]', 'Specific environment to use')
    // .option('--separateFiles [boolean]', 'District changelogs into own files')
    .action(async (options: ChangelogCliArgs) => {
        validateOptions(options)
        if (options.mergeAll === undefined) {
            options.mergeAll = false
        }
        try {
            const config = await readConfig(options?.config, options.environment)
            await changelogRun(options, config)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    })

program
    .command('version')
    .description('Manage version and release process')
    .option('--init [version]', 'Initialize first version')
    .option('--reset', 'Reset version history')
    .option('-m, --major', 'Increment major version')
    .option('-i, --minor', 'Increment minor version')
    .option('-p, --patch', 'Increment patch version')
    .option('-c, --channel <channel>', 'Specify the prerelease channel (e.g., alpha, beta)')
    .option('--no-channel-number', 'Exclude channel number')
    .option('--prefix <prefix>', 'Specify version prefix')
    .option('--prerelease <identifier>', 'Add prerelease identifier')
    .option('--build <identifier>', 'Add build metadata')
    .option('-l, --list [count]', 'List versions (optionally specify count)')
    .option('--latest', 'Show latest version')
    .option('--tag', 'Create git tag for version')
    .option('--push', 'Push changes and tags to remote')
    .option('--draft', 'Create draft release')
    .option('--note <message>', 'Add release note')
    .option('--note-file <path>', 'Add release notes from file')
    .option('--compare <version>', 'Compare with another version')
    .option('--revert <version>', 'Revert to specific version')
    .option('--validate <version>', 'Validate version string')
    .option('--branch', 'Create release branch automatically')
    .option('--sync', 'Sync versions with remote')
    .action(async (options: VersionCliArgs) => {
        await runVersion(options)

    })



import { VersionCliArgs } from './cli/types/VersionCliArgs'
import { simpleGit } from 'simple-git'
import { BranchCliArgs } from './cli/types/BranchCliArgs'
import { GitVersionManager } from './modules/version/GitVersionManager'

const git = simpleGit()


program
    .command('branch')
    .description('Manage git branches')
    .option('-c, --create <branchName>', 'Create a new branch')
    .option('-d, --delete <branchName>', 'Delete a branch')
    .option('-l, --list', 'List all branches')
    .option('-s, --switch <branchName>', 'Switch to the specified branch')
    .option('-m, --merge <branchName>', 'Merge the specified branch into the current branch')
    .option('--release <version>', 'Create a release branch (release/v{version})')
    .option('--hotfix <version>', 'Create a hotfix branch (hotfix/v{version})')
    .option('--feature <name>', 'Create a feature branch (feature/{name})')
    .option('--finish <branchName>', 'Finish a feature/release/hotfix branch')
    .option('--protect <branchName>', 'Protect a branch from direct commits')
    .option('--unprotect <branchName>', 'Remove branch protection')
    .option('--rebase <branchName>', 'Rebase current branch with specified branch')
    .option('--sync', 'Sync current branch with its remote')
    .option('--push', 'Push changes to remote after operation')
    .action(async (options: BranchCliArgs) => {
        try {
            if (options.create) {
                await createBranch(options.create, options.push)
            } else if (options.delete) {
                await deleteBranch(options.delete)
            } else if (options.list) {
                await listBranches()
            } else if (options.switch) {
                await switchBranch(options.switch)
            } else if (options.merge) {
                await mergeBranch(options.merge, options.push)
            } else if (options.release) {
                await createReleaseBranch(options.release, options.push)
            } else if (options.hotfix) {
                await createHotfixBranch(options.hotfix, options.push)
            } else if (options.feature) {
                await createFeatureBranch(options.feature, options.push)
            } else if (options.finish) {
                await finishBranch(options.finish, options.push)
            } else if (options.protect) {
                await protectBranch(options.protect)
            } else if (options.unprotect) {
                await unprotectBranch(options.unprotect)
            } else if (options.rebase) {
                await rebaseBranch(options.rebase, options.push)
            } else if (options.sync) {
                await syncBranch(options.push)
            } else {
                console.log('Please specify an option for branch management.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    })

async function createBranch(branchName: string, push?: boolean): Promise<void> {
    const currentBranch = await getCurrentBranch()
    await git.checkoutLocalBranch(branchName)
    console.log(`Created and switched to branch '${branchName}' from '${currentBranch}'`)

    if (push) {
        await git.push('origin', branchName)
        console.log(`Pushed branch '${branchName}' to remote`)
    }
}

async function deleteBranch(branchName: string): Promise<void> {
    const currentBranch = await getCurrentBranch()
    if (currentBranch === branchName) {
        throw new Error(`Cannot delete the current branch: ${branchName}`)
    }

    // Check if branch is protected
    if (await isBranchProtected(branchName)) {
        throw new Error(`Cannot delete protected branch: ${branchName}`)
    }

    await git.deleteLocalBranch(branchName, true)
    console.log(`Deleted branch '${branchName}'`)

    try {
        await git.push(['origin', '--delete', branchName])
        console.log(`Deleted remote branch '${branchName}'`)
    } catch (error) {
        console.log(`Note: Remote branch '${branchName}' doesn't exist or already deleted`)
    }
}

async function listBranches(): Promise<void> {
    const branchSummary = await git.branch(['-a'])
    const currentBranch = branchSummary.current
    const protectedBranches = await getProtectedBranches()

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

async function switchBranch(branchName: string): Promise<void> {
    await git.checkout(branchName)
    console.log(`Switched to branch '${branchName}'`)
}

async function mergeBranch(branchName: string, push?: boolean): Promise<void> {
    const currentBranch = await getCurrentBranch()

    if (await isBranchProtected(currentBranch)) {
        const confirmation = await confirmAction(`Warning: You're merging into protected branch '${currentBranch}'. Continue?`)
        if (!confirmation) {
            console.log('Merge cancelled')
            return
        }
    }

    await git.merge([branchName])
    console.log(`Merged '${branchName}' into '${currentBranch}'`)

    if (push) {
        await git.push('origin', currentBranch)
        console.log(`Pushed changes to remote '${currentBranch}'`)
    }
}

async function createReleaseBranch(version: string, push?: boolean): Promise<void> {
    const branchName = `release/v${version}`
    await createBranch(branchName, push)
    await protectBranch(branchName)
    console.log(`Created protected release branch '${branchName}'`)
}

async function createHotfixBranch(version: string, push?: boolean): Promise<void> {
    const branchName = `hotfix/v${version}`
    await createBranch(branchName, push)
    console.log(`Created hotfix branch '${branchName}'`)
}

async function createFeatureBranch(name: string, push?: boolean): Promise<void> {
    const branchName = `feature/${name}`
    await createBranch(branchName, push)
    console.log(`Created feature branch '${branchName}'`)
}

async function finishBranch(branchName: string, push?: boolean): Promise<void> {
    const currentBranch = await getCurrentBranch()
    const gitVersionManager = new GitVersionManager()

    if (branchName.startsWith('feature/')) {
        await mergeBranch('develop', push)
    } else if (branchName.startsWith('release/')) {
        await mergeBranch('main', push)
        await mergeBranch('develop', push)
        // Create tag for release
        const version = branchName.replace('release/v', '')
        await gitVersionManager.createGitTag(`v${version}`)
    } else if (branchName.startsWith('hotfix/')) {
        await mergeBranch('main', push)
        await mergeBranch('develop', push)
        // Create tag for hotfix
        const version = branchName.replace('hotfix/v', '')
        await gitVersionManager.createGitTag(`v${version}`)
    }

    await deleteBranch(branchName)
    console.log(`Finished and cleaned up branch '${branchName}'`)
}

async function protectBranch(branchName: string): Promise<void> {
    const protectedBranches = await getProtectedBranches()
    if (!protectedBranches.includes(branchName)) {
        protectedBranches.push(branchName)
        await saveProtectedBranches(protectedBranches)
        console.log(`Protected branch '${branchName}'`)
    }
}

async function unprotectBranch(branchName: string): Promise<void> {
    const protectedBranches = await getProtectedBranches()
    const index = protectedBranches.indexOf(branchName)
    if (index > -1) {
        protectedBranches.splice(index, 1)
        await saveProtectedBranches(protectedBranches)
        console.log(`Removed protection from branch '${branchName}'`)
    }
}

async function rebaseBranch(branchName: string, push?: boolean): Promise<void> {
    const currentBranch = await getCurrentBranch()
    await git.rebase([branchName])
    console.log(`Rebased '${currentBranch}' with '${branchName}'`)

    if (push) {
        await git.push('origin', currentBranch, ['--force'])
        console.log(`Force pushed rebased changes to '${currentBranch}'`)
    }
}

async function syncBranch(push?: boolean): Promise<void> {
    const currentBranch = await getCurrentBranch()
    await git.pull('origin', currentBranch, ['--rebase'])
    console.log(`Synced '${currentBranch}' with remote`)

    if (push) {
        await git.push('origin', currentBranch)
        console.log(`Pushed local changes to remote '${currentBranch}'`)
    }
}

// Helper functions
async function getCurrentBranch(): Promise<string> {
    const branchSummary = await git.branch()
    return branchSummary.current
}

async function isBranchProtected(branchName: string): Promise<boolean> {
    const protectedBranches = await getProtectedBranches()
    return protectedBranches.includes(branchName)
}

async function getProtectedBranches(): Promise<string[]> {
    try {
        const config = await git.listConfig()
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
        return ['main', 'master', 'develop']
    } catch {
        return ['main', 'master', 'develop']
    }
}

async function saveProtectedBranches(branches: string[]): Promise<void> {
    await git.addConfig('branch.protected', JSON.stringify(branches))
}

async function confirmAction(message: string): Promise<boolean> {
    // Implementation depends on your preferred CLI interaction library
    // For example, using 'inquirer'
    return true // Placeholder
}

program.action(() => {
    console.log('Please specify a command or use --help for usage information')
    process.exit(1)
})

program.parse(process.argv)
