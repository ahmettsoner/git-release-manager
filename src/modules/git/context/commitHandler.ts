import { execWithErrorHandling } from '../../../utils/cmd'
import { CommitInfo } from '../types/CommitInfo'

export async function getCommitsAsync(): Promise<CommitInfo> {
    const [{ stdout: hash }, { stdout: shortHash }, { stdout: message }, { stdout: body }, { stdout: authorName }, { stdout: authorEmail }, { stdout: date }, { stdout: count }] = await Promise.all([
        execWithErrorHandling("git log -1 --pretty=format:'%H'"),
        execWithErrorHandling("git log -1 --pretty=format:'%h'"),
        execWithErrorHandling("git log -1 --pretty=format:'%s'"),
        execWithErrorHandling("git log -1 --pretty=format:'%b'"),
        execWithErrorHandling('git log -1 --pretty=format:"%an"'),
        execWithErrorHandling('git log -1 --pretty=format:"%ae"'),
        execWithErrorHandling("git log -1 --pretty=format:'%ad'"),
        execWithErrorHandling('git rev-list --count HEAD'),
    ])

    return {
        latest: {
            hash,
            shortHash,
            message,
            body,
            authorName,
            authorEmail,
            date,
        },
        count: parseInt(count.trim(), 10) || 0,
    }
}
