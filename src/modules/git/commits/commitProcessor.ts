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
            const { stdout: filesOutput } = await execWithErrorHandling(`git log --pretty=format:"" --no-commit-id --name-only -r ${parsedCommit.raw.hash}`)
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
