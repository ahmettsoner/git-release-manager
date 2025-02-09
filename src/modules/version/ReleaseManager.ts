import simpleGit from "simple-git"
import { VersionCliArgs } from "../../cli/types/VersionCliArgs"
import { readFileSync } from "fs"
import { GitVersionManager } from "./GitVersionManager"

const git = simpleGit()

export class ReleaseManager {
    // createVersion()
    // createGitHubRelease()
    // readReleaseNotesFromFile()


    async  createVersion(version: string, options: VersionCliArgs): Promise<void> {
        const gitVersionManager = new GitVersionManager()
        const releaseManager = new ReleaseManager()

        // Create release branch if requested
        if (options.branch) {
            const branchName = `release/v${version}`
            await git.checkoutLocalBranch(branchName)
            console.log(`Created release branch: ${branchName}`)
        }
    
        // Create git tag
        if (options.tag !== false) {
            // Default to true if not explicitly set to false
            await gitVersionManager.createGitTag(version)
            console.log(`Created tag: ${version}`)
        }
    
        // Handle release notes
        let releaseNotes = ''
        if (options.note) {
            releaseNotes = options.note
        } else if (options.noteFile) {
            releaseNotes = await releaseManager.readReleaseNotesFromFile(options.noteFile)
        }
    
        // Create GitHub release if draft option is specified
        if (options.draft) {
            await releaseManager.createGitHubRelease(version, releaseNotes, true)
            console.log(`Created draft release for version ${version}`)
        }
    
        // Push changes if requested
        if (options.push) {
            await gitVersionManager.pushChanges(version, options.branch)
            console.log('Pushed changes to remote')
        }
    
        console.log(`Version ${version} created successfully`)
    }


async  createGitHubRelease(version: string, notes: string, draft: boolean): Promise<void> {
    // GitHub API implementation would go here
    // This is a placeholder for actual GitHub release creation
    console.log(`Would create GitHub release for ${version}`)
}

async  readReleaseNotesFromFile(filePath: string): Promise<string> {
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
    
}