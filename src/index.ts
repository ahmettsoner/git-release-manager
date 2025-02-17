#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CliArgs } from './cli/types/CliArgs'
import { ChangelogCliArgs } from './cli/types/ChangelogCliArgs'
import { VersionCliArgs } from './cli/types/VersionCliArgs'
import { BranchCliArgs } from './cli/types/BranchCliArgs'
import { branchRun, changelogRun, versionRun } from './core/app'

import { PackageJson } from './types/PackageJson'

const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
    .name(packageJson.name ?? 'changelog')
    .description(packageJson.description ?? 'Changelog generator tool')
    .version(packageJson.version ?? '0.0.0', '-v, --version', 'Show version number')
    .helpOption('-h, --help', 'Show help information')

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
        await changelogRun(options)
    })

program
    .command('version')
    .description('Manage version and release process')
        // Core version operations
        .option('--init [version]', 'Initialize first version')
        .option('--reset', 'Reset version history')
        .option('-m, --major', 'Increment major version')
        .option('-i, --minor', 'Increment minor version')
        .option('-p, --patch', 'Increment patch version')
        
        // Version modifiers
        .option('-c, --channel <channel>', 'Specify prerelease channel (alpha, beta)')
        .option('--prefix <prefix>', 'Specify version prefix')
        .option('--prerelease <identifier>', 'Add prerelease identifier')
        .option('--build <identifier>', 'Add build metadata')
        // .option('--channel-number <identifier>', 'Add build metadata')? is necessary
        .option('--no-channel-number', 'Exclude channel number')
        
        // Version management
        .option('-d, --detect [path]', 'Detect version from project file')
        .option('-u, --update [path]', 'Update version in project file')
        .option('--sync', 'Sync versions with remote')
        .option('--revert <version>', 'Revert to specific version')
        
        // Version information
        .option('-l, --list [count]', 'List versions')
        .option('-L, --latest', 'Show latest version')
        .option('--compare <version>', 'Compare with another version')
        .option('--validate <version>', 'Validate version string')
        
        // Release management
        .option('--tag', 'Create git tag for version')
        .option('--push', 'Push changes and tags to remote')
        .option('--draft', 'Create draft release')
        .option('--branch', 'Create release branch automatically')
        .option('--note <message>', 'Add release note')
        .option('--note-file <path>', 'Add release notes from file')

    .action(async (options: VersionCliArgs) => {
        await versionRun(options)
    })

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
        branchRun(options)
    })

program.action(() => {
    console.log('Please specify a command or use --help for usage information')
    process.exit(1)
})

program.parse(process.argv)
