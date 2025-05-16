import simpleGit from 'simple-git'
const git = simpleGit()

/**
 * Asynchronously checks if a given Git reference exists.
 *
 * @param value - The Git reference to check (e.g., branch name, commit hash).
 * @returns A promise that resolves to `true` if the reference exists, otherwise `false`.
 */
export async function revParse(value: string): Promise<boolean> {
    try {
        const result = await git.revparse([value])
        return !!result
    } catch {
        return false
    }
}

/**
 * Checks if the given value is a valid Git reference.
 *
 * @param value - The string to check as a Git reference.
 * @returns A promise that resolves to `true` if the value is a valid Git reference, otherwise `false`.
 */
export async function isGitRef(value: string): Promise<boolean> {
    return revParse(value)
}

export function parseRange(range: string): { from: string | null; to: string | null } {
    if (!range) return { from: null, to: null }
    const [from, to] = range.split('..')
    return { from, to }
}
