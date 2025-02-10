#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CliArgs } from './cli/types/CliArgs'
import { ChangelogCliArgs } from './cli/types/ChangelogCliArgs'
<<<<<<< HEAD
import { PackageJson } from './types/PackageJson'
import { run as changelogRun } from './core/changelog/app'
import { readConfig } from './config/configManager'

// Read package.json
=======
import { VersionCliArgs } from './cli/types/VersionCliArgs'
import { BranchCliArgs } from './cli/types/BranchCliArgs'
import { branchRun, changelogRun, versionRun } from './core/app'

import { PackageJson } from './types/PackageJson'

>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
    .name(packageJson.name ?? 'changelog')
    .description(packageJson.description ?? 'Changelog generator tool')
    .version(packageJson.version ?? '0.0.0', '-v, --version', 'Show version number')
    .helpOption('-h, --help', 'Show help information')

<<<<<<< HEAD
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

=======
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
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
<<<<<<< HEAD
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
const defaultVersion = '0.0.0'
type VersionType = 'major' | 'minor' | 'patch'
=======
        await changelogRun(options)
    })
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75

program
    .command('version')
    .description('Manage version and release process')
<<<<<<< HEAD
    .option('--init <version>', 'Initialize first version')
=======
    .option('--init [version]', 'Initialize first version')
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
    .option('--reset', 'Reset version history')
    .option('-m, --major', 'Increment major version')
    .option('-i, --minor', 'Increment minor version')
    .option('-p, --patch', 'Increment patch version')
    .option('-c, --channel <channel>', 'Specify the prerelease channel (e.g., alpha, beta)')
<<<<<<< HEAD
=======
    .option('-d, --detect [path]', 'Detect version from project file. If path is not specified, searches in current directory')
    .option('-u, --update [path]', 'Update version in project file')
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
    .option('--no-channel-number', 'Exclude channel number')
    .option('--prefix <prefix>', 'Specify version prefix')
    .option('--prerelease <identifier>', 'Add prerelease identifier')
    .option('--build <identifier>', 'Add build metadata')
    .option('-l, --list [count]', 'List versions (optionally specify count)')
<<<<<<< HEAD
    .option('--latest', 'Show latest version')
=======
    .option('-L, --latest', 'Show latest version')
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
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
<<<<<<< HEAD
        try {
            // Validate version manipulation options
            validateVersionOptions(options)

            // Handle different version commands
            if (options.list) {
                await listVersions(options.list === true ? 10 : parseInt(options.list as string))
                return
            }

            if (options.latest) {
                await showLatestVersion()
                return
            }

            if (options.compare) {
                await compareVersions(options.compare)
                return
            }

            if (options.revert) {
                await revertToVersion(options.revert, options.push)
                return
            }

            if (options.validate) {
                validateVersionFormat(options.validate)
                return
            }

            if (options.sync) {
                await syncVersions(options.push)
                return
            }

            // Handle version creation/update
            const newVersion = await generateNewVersion(options)
            await createVersion(newVersion, options)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    })

function validateVersionOptions(options: VersionCliArgs): void {
    const versionIncrementOptions = [options.major, options.minor, options.patch].filter(Boolean).length

    if (versionIncrementOptions > 1) {
        throw new Error('Cannot specify multiple version increment options')
    }

    if (options.init && (options.major || options.minor || options.patch)) {
        throw new Error('Cannot combine --init with version increment options')
    }

    if (options.revert && (options.major || options.minor || options.patch)) {
        throw new Error('Cannot combine --revert with version increment options')
    }
}

async function generateNewVersion(options: VersionCliArgs): Promise<string> {
    let newVersion: string

    if (options.init) {
        const tags = await git.tags()
        if (tags.all.length > 0) {
            throw new Error('Repository already has tags. Use --reset if needed.')
        }
        newVersion = options.init
    } else {
        const latestTag = await getLatestTag(options.prefix, options.channel)

        if (options.major || options.minor || options.patch) {
            const type = options.major ? 'major' : options.minor ? 'minor' : 'patch'
            newVersion = await incrementVersion(latestTag, type, {
                channel: options.channel,
                noChannelNumber: options.noChannelNumber,
                prefix: options.prefix,
                prerelease: options.prerelease,
                build: options.build,
            })
        } else if (options.channel) {
            newVersion = await incrementChannelOnly(latestTag, {
                channel: options.channel,
                noChannelNumber: options.noChannelNumber,
                prefix: options.prefix,
                build: options.build,
            })
        } else {
            throw new Error('No version increment option specified')
        }
    }

    return newVersion
}

async function createVersion(version: string, options: VersionCliArgs): Promise<void> {
    // Create release branch if requested
    if (options.branch) {
        const branchName = `release/v${version}`
        await git.checkoutLocalBranch(branchName)
        console.log(`Created release branch: ${branchName}`)
    }

    // Create git tag
    if (options.tag !== false) {
        // Default to true if not explicitly set to false
        await createGitTag(version)
        console.log(`Created tag: ${version}`)
    }

    // Handle release notes
    let releaseNotes = ''
    if (options.note) {
        releaseNotes = options.note
    } else if (options.noteFile) {
        releaseNotes = await readReleaseNotesFromFile(options.noteFile)
    }

    // Create GitHub release if draft option is specified
    if (options.draft) {
        await createGitHubRelease(version, releaseNotes, true)
        console.log(`Created draft release for version ${version}`)
    }

    // Push changes if requested
    if (options.push) {
        await pushChanges(version, options.branch)
        console.log('Pushed changes to remote')
    }

    console.log(`Version ${version} created successfully`)
}

async function listVersions(count: number = 10): Promise<void> {
    const tags = await git.tags()
    const versions = tags.all
        .filter(tag => semver.valid(tag))
        .sort((a, b) => semver.rcompare(a, b))
        .slice(0, count)

    console.log('\nVersion History:')
    console.log('================')

    for (const version of versions) {
        const tagDetails = await git.show(['--quiet', version])
        console.log(`\nVersion: ${version}`)
        console.log(`Date: ${tagDetails.split('\n')[2]}`)
        console.log('-----------------')
    }
}

async function showLatestVersion(): Promise<void> {
    const version = await getLatestTag()
    console.log(`Latest version: ${version}`)
}

async function compareVersions(compareVersion: string): Promise<void> {
    const latestVersion = await getLatestTag()
    const comparison = semver.compare(latestVersion, compareVersion)
    const diff = await git.diff([`${compareVersion}...${latestVersion}`])

    console.log(`Comparing ${compareVersion} with ${latestVersion}`)
    console.log(`${compareVersion} is ${comparison === 1 ? 'ahead' : 'behind'} ${latestVersion}`)
    console.log('\nChanges:')
    console.log(diff)
}

async function revertToVersion(version: string, push?: boolean): Promise<void> {
    if (!semver.valid(version)) {
        throw new Error(`Invalid version format: ${version}`)
    }

    await git.reset(['--hard', version])
    console.log(`Reverted to version ${version}`)

    if (push) {
        await git.push('origin', 'HEAD', ['--force'])
        console.log('Force pushed revert to remote')
    }
}

function validateVersionFormat(version: string): void {
    if (semver.valid(version)) {
        console.log(`Version ${version} is valid`)
    } else {
        throw new Error(`Invalid version format: ${version}`)
    }
}

async function syncVersions(push?: boolean): Promise<void> {
    await git.fetch(['--tags', '--force'])
    console.log('Synced tags with remote')

    if (push) {
        const localTags = await git.tags()
        await git.pushTags('origin')
        console.log('Pushed local tags to remote')
    }
}
async function readReleaseNotesFromFile(filePath: string): Promise<string> {
    try {
        return readFileSync(filePath, 'utf8')
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Could not read release notes file: ${error.message}`)
        }
        // Handle case where error is not an Error object
        throw new Error(`Could not read release notes file: ${String(error)}`)
    }
}

async function createGitHubRelease(version: string, notes: string, draft: boolean): Promise<void> {
    // GitHub API implementation would go here
    // This is a placeholder for actual GitHub release creation
    console.log(`Would create GitHub release for ${version}`)
}

async function pushChanges(version: string, hasBranch?: boolean): Promise<void> {
    if (hasBranch) {
        const branchName = `release/v${version}`
        await git.push('origin', branchName)
    }
    await git.pushTags()
}

import { VersionCliArgs } from './cli/types/VersionCliArgs'
import semver from 'semver'
import { simpleGit } from 'simple-git'
import { BranchCliArgs } from './cli/types/BranchCliArgs'

const git = simpleGit()

interface IncrementOptions {
    channel?: string
    noChannelNumber?: boolean
    prefix?: string
    prerelease?: string
    build?: string
}
export const getLatestTag = async (prefix?: string, channel?: string): Promise<string> => {
    let defaultTag = '0.0.0'
    if (prefix) {
        defaultTag = `${prefix}${defaultTag}`
    }

    try {
        const tags = await git.tags()
        let filteredTags = tags.all

        if (prefix) {
            filteredTags = filteredTags.filter(tag => tag.startsWith(prefix))
        }

        if (channel) {
            const channelTags = filteredTags.filter(tag => tag.includes(`-${channel}`))
            filteredTags = channelTags.length > 0 ? channelTags : filteredTags
        }

        const latestTag =
            filteredTags
                .map(tag => (prefix ? tag.replace(prefix, '') : tag))
                .filter(tag => semver.valid(tag))
                .sort(semver.rcompare)[0] || defaultTag

        return prefix ? `${prefix}${latestTag}` : latestTag
    } catch (error) {
        console.error('Could not retrieve tags:', error)
        return defaultTag
    }
}

export const incrementChannelOnly = (version: string, options: IncrementOptions): string => {
    const { channel, noChannelNumber, prefix, build } = options

    if (!channel) {
        throw new Error('Channel must be specified for channel-only increment')
    }

    // Remove prefix if exists for processing
    let versionWithoutPrefix = prefix ? version.replace(prefix, '') : version

    // Remove build metadata for processing
    versionWithoutPrefix = versionWithoutPrefix.split('+')[0]

    if (!semver.valid(versionWithoutPrefix)) {
        throw new Error(`Invalid version format: ${version}`)
    }

    // Get the base version without prerelease or build metadata
    const baseVersion = versionWithoutPrefix.split('-')[0]
    let newVersion: string

    if (noChannelNumber) {
        // Simple channel without number
        newVersion = `${baseVersion}-${channel}`
    } else {
        // Check current prerelease information
        const currentPrerelease = semver.prerelease(versionWithoutPrefix)

        if (currentPrerelease) {
            if (currentPrerelease[0] === channel) {
                // Same channel: increment the number
                const currentNumber = parseInt(currentPrerelease[1] as string, 10) || 0
                newVersion = `${baseVersion}-${channel}.${currentNumber + 1}`
            } else {
                // Different channel: start new sequence
                newVersion = `${baseVersion}-${channel}.1`
            }
        } else {
            // No previous prerelease: start new sequence
            newVersion = `${baseVersion}-${channel}.1`
        }
    }

    // Add build metadata if specified
    if (build) {
        newVersion = `${newVersion}+${build}`
    }

    // Add prefix back if specified
    return prefix ? `${prefix}${newVersion}` : newVersion
}

// Update incrementVersion function to handle undefined versionType
export const incrementVersion = (version: string, type: VersionType, options: IncrementOptions = {}): string => {
    const { channel, noChannelNumber, prefix, prerelease, build } = options

    // Remove prefix if exists for processing
    let versionWithoutPrefix = prefix ? version.replace(prefix, '') : version

    // Remove build metadata for processing (will be added back later)
    versionWithoutPrefix = versionWithoutPrefix.split('+')[0]

    if (!semver.valid(versionWithoutPrefix)) {
        throw new Error(`Invalid version format: ${version}`)
    }

    // Get the base version without prerelease or build metadata
    const baseVersion = versionWithoutPrefix.split('-')[0]

    // Increment the base version according to type
    const incrementedVersion = semver.inc(baseVersion, type) || baseVersion

    // Build the final version string
    let newVersion = incrementedVersion

    // Add channel/prerelease information
    if (channel || prerelease) {
        const prereleaseIdentifier = channel || prerelease

        if (noChannelNumber) {
            newVersion = `${newVersion}-${prereleaseIdentifier}`
        } else {
            // Check if current version has the same prerelease identifier
            const currentPrerelease = semver.prerelease(versionWithoutPrefix)
            if (currentPrerelease && currentPrerelease[0] === prereleaseIdentifier) {
                // If version type changed, reset prerelease number to 1
                if (semver.gt(incrementedVersion, baseVersion)) {
                    newVersion = `${newVersion}-${prereleaseIdentifier}.1`
                } else {
                    // Increment prerelease number
                    const currentNumber = parseInt(currentPrerelease[1] as string, 10) || 0
                    newVersion = `${newVersion}-${prereleaseIdentifier}.${currentNumber + 1}`
                }
            } else {
                // Start new prerelease sequence
                newVersion = `${newVersion}-${prereleaseIdentifier}.1`
            }
        }
    }

    // Add build metadata if specified
    if (build) {
        newVersion = `${newVersion}+${build}`
    }

    // Add prefix back if specified
    return prefix ? `${prefix}${newVersion}` : newVersion
}
export const initVersion = async (initVersion?: string, channel?: string, prefix?: string) => {
    try {
        const newVersion = initVersion ?? '0.0.0'
        createGitTag(newVersion)
        console.log('initial tag created:', newVersion)
    } catch (error) {
        console.error('Error creating init tag:', error)
    }
}
export const resetVersion = async (channel?: string, prefix?: string) => {
    try {
        const { all: tags } = await git.tags()
        if (tags.length === 0) {
            console.log('No local tags found.')
            return
        }

        await git.raw(['tag', '-d', ...tags])
        console.log('All local tags deleted:', tags)
    } catch (error) {
        console.error('Error deleting tags:', error)
    }
}

export const createGitTag = async (version: string): Promise<void> => {
    try {
        await git.addTag(version)
        // await git.pushTags()
    } catch (error) {
        console.error('Could not create git tag:', error)
    }
}

=======
        await versionRun(options)
    })

>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
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
<<<<<<< HEAD
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

    if (branchName.startsWith('feature/')) {
        await mergeBranch('develop', push)
    } else if (branchName.startsWith('release/')) {
        await mergeBranch('main', push)
        await mergeBranch('develop', push)
        // Create tag for release
        const version = branchName.replace('release/v', '')
        await createGitTag(`v${version}`)
    } else if (branchName.startsWith('hotfix/')) {
        await mergeBranch('main', push)
        await mergeBranch('develop', push)
        // Create tag for hotfix
        const version = branchName.replace('hotfix/v', '')
        await createGitTag(`v${version}`)
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

=======
        branchRun(options)
    })

>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
program.action(() => {
    console.log('Please specify a command or use --help for usage information')
    process.exit(1)
})

program.parse(process.argv)
