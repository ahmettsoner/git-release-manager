import simpleGit from 'simple-git'
import { GitCommit } from '../types/GitCommit'

export async function getGitLogAsJson(range: string | null = null): Promise<GitCommit[]> {
    const git = simpleGit()
    try {
        const log = range ? await git.log([range]) : await git.log()
        return log.all.map(commit => ({
            hash: commit.hash,
            shortHash: commit.hash.substring(0, 7),
            message: commit.message,
            body: commit.body,
            authorName: commit.author_name,
            authorEmail: commit.author_email,
            date: commit.date,
        }))
    } catch (error) {
        console.error('Error fetching git log:', error)
        return []
    }
}
