import simpleGit from 'simple-git'
import { revParse } from './refUtils'
import { execWithErrorHandling } from '../../../utils/cmd'

const git = simpleGit()

export async function getCommitCount(range: string): Promise<number> {
    let commitCount: number = 0

    try {
        const { stdout } = await execWithErrorHandling(`git rev-list --count ${range}`)
        commitCount = parseInt(stdout.trim(), 10)
        return commitCount
    } catch (error) {
        console.error('Error counting commits in range:', error)
        throw error
    }
}
/**
 * Checks if the given value is a valid Git commit.
 *
 * @param value - The value to check if it is a valid Git commit.
 * @returns A promise that resolves to a boolean indicating whether the value is a valid Git commit.
 */
export async function isGitCommit(value: string): Promise<boolean> {
    return revParse(value)
}

/**
 * Resolves the commit ID for a given reference.
 *
 * @param value - The reference to resolve (e.g., branch name, tag, or commit hash).
 * @returns A promise that resolves to the commit ID as a string, or null if the reference cannot be resolved.
 */
export async function resolveCommitId(value: string): Promise<string | null> {
    try {
        return await git.revparse([value])
    } catch {
        return null
    }
}
