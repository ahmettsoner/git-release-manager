#!/usr/bin/env node

import { Argument, Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { VersionCliArgs } from './cli/types/VersionCliArgs'
import { BranchCliArgs } from './cli/types/BranchCliArgs'
import {
    branchRun,
    changelogRun,
    commitAmendRun,
    commitCreateRun,
    commitListRun,
    versionInitRun,
    versionResetRun,
    versionRevertRun,
    versionRun,
    versionSetRun,
    versionValidateRun,
} from './core/app'

import { PackageJson } from './types/PackageJson'
import { CommitCreateCliArgs } from './cli/types/CommitCreateCliArgs'
import { CommitListCliArgs } from './cli/types/CommitListCliArgs'
import { ChangelogGenerateCliArgs } from './cli/types/ChangelogGenerateCliArgs'
import { CliArgs } from './cli/types/CliArgs'
import { VersionListCliArgs } from './cli/types/VersionListCliArgs'
import { VersionSetCliArgs } from './cli/types/VersionSetCliArgs'
import { VersionIncrementCliArgs } from './cli/types/VersionIncrementCliArgs'
import { VersionCompareCliArgs } from './cli/types/VersionCompareCliArgs'
import { VersionProjectCliArgs } from './cli/types/VersionProjectCliArgs'
import { VersionRemoteCliArgs } from './cli/types/VersionRemoteCliArgs'
import { VersionInitCliArgs } from './cli/types/VersionInitCliArgs'
import { VersionResetCliArgs } from './cli/types/VersionResetCliArgs'
import { VersionRevertCliArgs } from './cli/types/VersionRevertCliArgs'
import { VersionValidateCliArgs } from './cli/types/VersionValidateCliArgs'
import { BranchCreateCliArgs } from './cli/types/BranchCreateCliArgs'

const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
    .name(packageJson.name ?? 'Git Release Manager')
    .description(packageJson.description ?? 'Tools to manage your git releases and versioning')
    .version(packageJson.version ?? '0.0.0', '-v, --version', 'Show the current version number')
    .helpOption('-h, --help', 'Display help information')

program.option('--config <path>', 'Specify a custom config file path').option('--environment <env>', 'Set a specific environment to use')

const programCommitAmend = program
    .command('amend')
    .alias('ca')
    .description('Amend the previous commit')
    .action(async (commandOptions: CliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        commitAmendRun(options)
    })

program
    .command('commit')
    .alias('c')
    .description('Operations related to git commits')
    .addCommand(
        new Command()
            .command('create')
            .alias('cc')
            .description('Create a new commit with staged changes')
            .option('-m, --message <message>', 'Specify the commit message')
            .option('-b, --body <lines...>', 'Add commit body text')
            .option('-t, --type <type>', 'Specify commit type (e.g., feat, fix, chore)')
            .option('-s, --scope <scope>', 'Specify commit scope (e.g., module or component)')
            .option('-a, --all', 'Stage all modified and deleted files for commit')
            .option('-f, --file <files...>', 'Specify individual files to stage and commit')
            .option('--dry-run', 'Show what would be committed without committing')
            .option('--no-verify', 'Skip pre-commit and commit-msg hooks')
            .option('-i, --sign', 'Sign the commit with a GPG key')
            .action(async (commandOptions: CommitCreateCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                console.log(commandOptions.message)
                commitCreateRun(options)
            })
    )
    .addCommand(
        new Command()
            .command('list')
            .alias('l')
            .description('List recent commits with options to filter')
            .option('--count <number>', 'Number of commits to list')
            .action(async (commandOptions: CommitListCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                commitListRun(options)
            })
    )
    .addCommand(programCommitAmend)

const programChangelogGenerate = program
    .command('generate')
    .alias('cg')
    .description('Generate a changelog from commit history')
    .option('--from <ref>', 'Start reference point (commit, tag, branch, or date)')
    .option('--to <ref>', 'End reference point (commit, tag, branch, or date)')
    .option('--range <range>', 'Specify a range of references')
    .option('--point <commit | tag | branch| date | reference>', 'Specify a single reference')
    .option('--merge-all', 'Merge all changes into a single output')
    .option('--template <path>', 'Path to a custom template file')
    .option('--output <path>', 'Path to output the changelog')
    .option('--dry-run', 'Preview the changelog generation without writing')
    .action(async (commandOptions: ChangelogGenerateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await changelogRun(options)
    })

program.command('changelog').description('Changelog helper').addCommand(programChangelogGenerate)

const programVersionIncrement = program
    .command('increment')
    .alias('vi')
    .description('Increment the project version based on semantic versioning')
    .option('-m, --major', 'Increment the major version number')
    .option('-i, --minor', 'Increment the minor version number')
    .option('-p, --patch', 'Increment the patch version number')
    .option('-c, --channel <channel>', 'Specify prerelease channel (e.g., alpha, beta)')
    .option('--prefix <prefix>', 'Add a prefix to the version number')
    .option('--prerelease <identifier>', 'Add a prerelease identifier')
    .option('--build <identifier>', 'Add build metadata')
    .option('--no-channel-number', 'Exclude channel number')
    .option('--note <message>', 'Add a release note')
    .option('--note-file <path>', 'Load release notes from a file')
    .action(async (commandOptions: VersionIncrementCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionRun(options)
    })
const programVersionInit = program
    .command('init')
    .alias('vin')
    .description('Initialize the project version')
    .addArgument(new Argument('<version>', 'Version to initialize'))
    .option('--note <message>', 'Add a release note during initialization')
    .option('--note-file <path>', 'Load release notes from a file for initialization')
    .action(async (commandOptions: VersionInitCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionInitRun(options)
    })
const programVersionReset = program
    .command('reset')
    .alias('vr')
    .description('Reset the project version to initial state')
    .action(async (commandOptions: VersionResetCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionResetRun(options)
    })
const programVersionSet = program
    .command('set')
    .alias('vs')
    .description('Explicitly set the project version')
    .addArgument(new Argument('<version>', 'Version to set'))
    .option('--note <message>', 'Add a release note while setting the version')
    .option('--note-file <path>', 'Load release notes from a file for setting the version')
    .action(async (commandOptions: VersionSetCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionSetRun(options)
    })
const programVersionRevert = program
    .command('revert')
    .alias('vrev')
    .description('Revert the project to a specific version')
    .addArgument(new Argument('<version>', 'Version to revert to'))
    .action(async (commandOptions: VersionRevertCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionRevertRun(options)
    })
const programVersionValidate = program
    .command('validate')
    .alias('vv')
    .description('Check if a version string is valid')
    .addArgument(new Argument('<version>', 'Version string to validate'))
    .action(async (commandOptions: VersionValidateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionValidateRun(options)
    })

const programVersionCompare = program
    .command('compare')
    .alias('vc')
    .description('Compare a specific version with the current/latest one')
    .option('--version <version>', 'Version to compare against the latest')
    .action(async (commandOptions: VersionCompareCliArgs) => {
        console.log(`Comparing version: ${commandOptions.version}`)
    })

const programVersionProject = program
    .command('project')
    .alias('vp')
    .description('Manage project version synchronization with local resources')
    .option('--path <path>', 'Specify the project file or folder path')
    .option('-d, --detect', 'Detect the current version from the project')
    .option('-u, --update [version]', 'Update version in project to specified value')
    .action(async (commandOptions: VersionProjectCliArgs) => {
        console.log(`Comparing version: ${commandOptions.path}`)
    })

program
    .command('version')
    .description('Comprehensive version and release management operations')
    .addCommand(programVersionInit)
    .addCommand(programVersionIncrement)
    .addCommand(programVersionSet)
    .addCommand(programVersionReset)
    .addCommand(
        new Command()
            .command('list')
            .alias('vl')
            .description('Check if a version string is valid')
            .addArgument(new Argument('<version>', 'Version string to validate'))
            // .option('-r, --reverse', 'List versions in reverse order')
            // .option('-t, --tag', 'List versions with tags')
            // .option('-d, --date', 'List versions with dates')
            // .option('-s, --sort', 'Sort versions')
            // .option('-v, --verbose', 'Show detailed version information')
            // .option('-a, --all', 'Show all versions')
            .action(async (commandOptions: VersionListCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                await versionRun(options)
            })
    )
    .addCommand(programVersionCompare)
    .addCommand(programVersionProject)
    .addCommand(programVersionValidate)
    .addCommand(programVersionRevert)
    .addCommand(
        new Command()
            .command('remote')
            .description('Synchronize version with remote repositories')
            .option('--sync', 'Sync versions with remote repository')
            .option('--push', 'Push local changes and tags to remote')
            .option('--draft', 'Create a draft release')
            .action(async (commandOptions: VersionRemoteCliArgs) => {
                console.log(`Comparing version: ${commandOptions.draft}`)
            })
    )
    .action(async (commandOptions: VersionCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await versionRun(options)
    })

const programBranchDelete = program
    .command('delete')
    .alias('bd')
    .description('Delete a given branch')
    .argument('<branchName>', 'Name of the branch to delete')
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })
const programBranchMerge = program
    .command('merge')
    .alias('bm')
    .description('Merge a branch into the current branch')
    .argument('<branchName>', 'Name of the branch to be merged')
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })
const programBranchSwitch = program
    .command('switch')
    .alias('bs')
    .description('Switch to branch')
    .addArgument(new Argument('<branchName>', 'branch to switch'))
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })
const programBranchProtect = program
    .command('protect')
    .alias('bp')
    .description('Protect a branch from direct commits')
    .argument('<branchName>', 'Name of the branch to protect')
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })
const programBranchUnProtect = program
    .command('unprotect')
    .alias('bun')
    .description('Remove protection from a branch')
    .argument('<branchName>', 'Name of the branch to unprotect')
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })
const programBranchRebase = program
    .command('rebase')
    .alias('br')
    .description('Rebase the current branch onto another specified branch')
    .argument('<branchName>', 'Name of the branch to rebase onto')
    .action(async (commandOptions: BranchCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        await branchRun(options)
    })

const branchTypes = [
    { name: 'release', prefix: 'release/' },
    { name: 'hotfix', prefix: 'hotfix/' },
    { name: 'feature', prefix: 'feature/' },
]

const createBranchSubcommand = (type: string, prefix: string) => {
    return new Command(type)
        .description(`Create and manage ${type} branches`)
        .argument('<name>', `Name of the ${type} branch`)
        .action(async commandOptions => {
            const options = { ...program.opts(), ...commandOptions }
            if (options[type]) {
                options.branchName = `${prefix}${options[type]}`
                console.log(`Creating ${type} branch: ${options.branchName}`)
                await branchRun(options)
            }
        })
}

const programBranch = program
    .command('branch')
    .description('Manage different types of git branches')
    .addCommand(
        new Command()
            .command('create')
            .alias('bc')
            .description('Create a new branch')
            .addArgument(new Argument('<branchName>', 'branch to create'))
            .action(async (commandOptions: BranchCreateCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                await branchRun(options)
            })
    )
    .addCommand(programBranchDelete)
    .addCommand(programBranchMerge)
    .addCommand(programBranchSwitch)
    .addCommand(programBranchProtect)
    .addCommand(programBranchUnProtect)
    .addCommand(programBranchRebase)
    .addCommand(
        new Command()
            .command('remote')
            .description('Synchronize version with remote tags and update remote')
            // .option('--sync', 'Sync versions with remote')
            // .option('--push', 'Push changes and tags to remote')
            // .option('--draft', 'Create draft release')
            .action(async (commandOptions: VersionRemoteCliArgs) => {
                console.log(`Comparing version: ${commandOptions.draft}`)
            })
    )
    // .option('--release <version>', 'Create a release branch (release/{version})')
    // .option('--hotfix <version>', 'Create a hotfix branch (hotfix/{version})')
    // .option('--feature <name>', 'Create a feature branch (feature/{name})')
    // .option('--finish [branchName]', 'Finish a feature/release/hotfix branch')
    .action(async (commandOptions: BranchCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        branchRun(options)
    })
programBranch.addCommand(
    new Command()
        .command('list')
        .alias('bl')
        .description('List all branches with filtering options')
        .option('-L, --latest', 'Display the latest branch only')
        .option('-c, --count [count]', 'List versions up to a count')
        // .option('-r, --reverse', 'List versions in reverse order')
        // .option('-t, --tag', 'List versions with tags')
        // .option('-d, --date', 'List versions with dates')
        // .option('-s, --sort', 'Sort versions')
        // .option('-v, --verbose', 'Show detailed version information')
        // .option('-a, --all', 'Show all versions')
        .action(async (commandOptions: BranchCreateCliArgs) => {
            const options = { ...program.opts(), ...commandOptions }
            await branchRun(options)
        })
)

branchTypes.forEach(type => {
    programBranch.addCommand(createBranchSubcommand(type.name, type.prefix))
})
program.action(() => {
    console.log('Please specify a command or use --help for usage information')
    process.exit(1)
})

program.parse(process.argv)
