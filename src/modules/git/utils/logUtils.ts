import simpleGit from 'simple-git'

const git = simpleGit()

/**
 * Retrieves the git log for the specified range.
 *
 * @param range - The range of commits to include in the log.
 * @returns A promise that resolves to the git log for the specified range.
 */
export async function getLog(range: string) {
    return git.log([range])
}
