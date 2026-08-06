import { Config } from '../../../config/types/Config'
import { createCommitMessageRegex } from './regexHandlers'
import { CommitContent } from '../types/CommitContent'
import simpleGit from 'simple-git'
import { GitCommit } from '../types/GitCommit'
import { enrichCommit } from '.'
import { execWithErrorHandling } from '../../../utils/cmd'

export async function listCommitsAsync(range: string | null, config: Config): Promise<CommitContent[]> {
    const commits = await getGitLogAsJson(range)
    const commitMessageRegex = createCommitMessageRegex(config.commitTypes)

    if (!commitMessageRegex) {
        return []
    }

    const filteredCommits = commits.filter(commit => commitMessageRegex.test(commit.message))

    const commitList = await Promise.all(
        filteredCommits.map(async commit => {
            const parsedCommit = await enrichCommit(commit, config)
            // `-1`, and its absence was the whole defect. `git log <hash>` walks
            // the ENTIRE ancestry of that commit, so asking "which files did this
            // commit touch" answered with every file touched since the root — once
            // per commit in the range, i.e. quadratic in history size. Measured
            // 2026-08-06 on a large repository: the output blew Node's 1 MiB exec
            // buffer, execWithErrorHandling swallowed the error and returned an
            // empty string, and the changelog rendered with NO files listed while
            // exiting 0. Raising the buffer alone converted that silent truncation
            // into a run that does not finish.
            const { stdout: filesOutput } = await execWithErrorHandling(`git log -1 --pretty=format: --name-only ${parsedCommit.raw.hash}`)
            const files = filesOutput.split('\n').filter(Boolean)

            return {
                ...parsedCommit,
                files,
            }
        })
    )

    return commitList
}

export async function getGitLogAsJson(range: string | null = null): Promise<GitCommit[]> {
    const git = simpleGit()

    try {
        const log = range ? await git.log([range]) : await git.log()

        const jsonArray = log.all.map(commit => ({
            hash: commit.hash,
            shortHash: commit.hash.substring(0, 7),
            message: commit.message,
            body: commit.body,
            authorName: commit.author_name,
            authorEmail: commit.author_email,
            date: commit.date,
        }))

        return jsonArray
    } catch (error) {
        console.error('Error fetching git log:', error)
        return []
    }
}
