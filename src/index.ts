#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CliArgs } from './cli/types/CliArgs'
import { ChangelogCliArgs } from './cli/types/ChangelogCliArgs'
import { PackageJson } from './types/PackageJson'
import { run as changelogRun } from './core/changelog/app'
import { readConfig } from './config/configManager'

// Read package.json
const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))

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
    .description('Update the version')
    .option('-m, --major', 'Increment major version')
    .option('-i, --minor', 'Increment minor version')
    .option('-p, --patch', 'Increment patch version')
    .option('-c, --channel <channel>', 'Specify the prerelease channel (e.g., alpha, beta)')
    .option('-n, --channel-number <number>', 'Specify the starting number for the prerelease', parseFloat)
    .action(async (options: VersionCliArgs) => {
        try {
            const currentVersion = await getCurrentVersion()
            let newVersion = currentVersion

            if (options.major) {
                newVersion = incrementVersion(currentVersion, 'major', options.channel, options.channelNumber)
            } else if (options.minor) {
                newVersion = incrementVersion(currentVersion, 'minor', options.channel, options.channelNumber)
            } else if (options.patch) {
                newVersion = incrementVersion(currentVersion, 'patch', options.channel, options.channelNumber)
            } else {
                console.log('Please specify which version to increment: major, minor, or patch.')
                process.exit(1)
            }

            createGitTag(newVersion)
            console.log(`Version updated to ${newVersion}`)
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    })

import { VersionCliArgs } from './cli/types/VersionCliArgs'
import semver from 'semver'
import { simpleGit, SimpleGit } from 'simple-git'
import { BranchCliArgs } from './cli/types/BranchCliArgs'

const git: SimpleGit = simpleGit()

export const getCurrentVersion = async (): Promise<string> => {
    try {
        const tags = await git.tags()
        const latestTag = tags.latest
        return latestTag ? `v${latestTag}` : 'v0.0.0'
    } catch (error) {
        console.error('Could not get current version:', error)
        return 'v0.0.0' // default başlangıç değeri
    }
}

export const incrementVersion = (version: string, type: 'major' | 'minor' | 'patch', channel?: string, channelNumber: number = 0): string => {
    if (!semver.valid(version)) version = '0.0.0'

    let newVersion: string | null

    if (channel) {
        newVersion = semver.inc(version, `pre${type}`)
        if (newVersion) {
            const pre = `${channel}.${channelNumber}`
            newVersion = `${semver.clean(newVersion)}-${pre}`
        }
    } else {
        newVersion = semver.inc(version, type)
    }

    if (!newVersion) {
        throw new Error('Invalid version increment operation')
    }

    return `v${newVersion}`
}

export const createGitTag = async (version: string): Promise<void> => {
    try {
        await git.addTag(version)
        await git.pushTags()
    } catch (error) {
        console.error('Could not create git tag:', error)
    }
}
program
    .command('branch')
    .description('Manage git branches')
    .option('-c, --create <branchName>', 'Create a new branch')
    .option('-d, --delete <branchName>', 'Delete a branch')
    .option('-l, --list', 'List all branches')
    .option('-s, --switch <branchName>', 'Switch to the specified branch')
    .option('-m, --merge <branchName>', 'Merge the specified branch into the current branch')
    .action(async (options: BranchCliArgs) => {
        try {
            if (options.create) {
                await git.branch([options.create])
                console.log(`Branch ${options.create} created.`)
            } else if (options.delete) {
                await git.deleteLocalBranch(options.delete)
                console.log(`Branch ${options.delete} deleted.`)
            } else if (options.list) {
                const branchSummary = await git.branch()
                const currentBranch = branchSummary.current
                const allBranches = new Set<string>()

                branchSummary.all.forEach(branch => {
                    if (branch.startsWith('remotes/')) {
                        allBranches.add(branch.replace('remotes/', ''))
                    } else {
                        allBranches.add(branch)
                    }
                })

                // Dalları listele ve current'ı işaretle
                console.log('Branches:')
                allBranches.forEach(branch => {
                    const isCurrent = branch.startsWith(currentBranch)
                    console.log(`${isCurrent ? '* ' : '  '}${branch}`)
                })
            } else if (options.switch) {
                await git.checkout(options.switch)
                console.log(`Switched to branch ${options.switch}.`)
            } else if (options.merge) {
                await git.merge([options.merge])
                console.log(`Merged branch ${options.merge} into current branch.`)
            } else {
                console.log('Please specify an option for branch management: create, delete, list, checkout, or merge.')
                process.exit(1)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    })

program.action(() => {
    console.log('Please specify a command or use --help for usage information')
    process.exit(1)
})

program.parse(process.argv)
