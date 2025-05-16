import simpleGit from 'simple-git'
import { Branch } from '../types/Branch'
import { execWithErrorHandling } from '../../../utils/cmd'

const git = simpleGit()

export async function getBranches(range: string): Promise<Array<Branch>> {
    try {
        const logCommand = `git log --oneline --decorate=short ${range}`
        const { stdout } = await execWithErrorHandling(logCommand)

        // Extract branches
        const branchRegex = /([a-f0-9]+)\s.*\(.*?([^,\s)]+)\)/g
        const branchesWithRefs: Array<Branch> = []
        let match
        while ((match = branchRegex.exec(stdout.trim())) !== null) {
            if (!match[2].startsWith('tag:')) {
                // Ensures it's a branch
                branchesWithRefs.push({ name: match[2], reference: match[1] })
            }
        }

        // Use a Set to filter unique branches by name
        const uniqueBranchesMap = new Map<string, Branch>()
        branchesWithRefs.forEach(branch => {
            if (!uniqueBranchesMap.has(branch.name)) {
                uniqueBranchesMap.set(branch.name, branch)
            }
        })

        return Array.from(uniqueBranchesMap.values())
    } catch (error) {
        console.error('Error retrieving branches in range:', error)
        throw error
    }
}

/**
 * Checks if the given value is a local Git branch.
 *
 * @param value - The name of the branch to check.
 * @returns A promise that resolves to `true` if the value is a local Git branch, otherwise `false`.
 */
export async function isGitBranch(value: string): Promise<boolean> {
    try {
        const branches = await git.branchLocal()
        return branches.all.includes(value)
    } catch {
        return false
    }
}
