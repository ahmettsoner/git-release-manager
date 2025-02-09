import { parseRemoteUrl } from './remoteHandler'
import { getBranchesAsync } from './branchHandler'
import { getTagsAsync } from './tagHandler'
import { getCommitsAsync } from './commitHandler'
import { getStatusAsync } from './statusHandler'
import { Repository } from '../types/Repository'
import { execWithErrorHandling } from '../../../utils/cmd'

export async function getCurrentRepositoryAsync(): Promise<Repository> {
    const [{ stdout: remoteUrl }, { stdout: name }] = await Promise.all([
        execWithErrorHandling('git config --get remote.origin.url'),
        execWithErrorHandling('git rev-parse --show-toplevel'),
    ])

    const result: Repository = {
        name: name.trim(),
        path: name.trim(),
        remote: parseRemoteUrl(remoteUrl.trim()),
        branches: await getBranchesAsync(),
        tags: await getTagsAsync(),
        commits: await getCommitsAsync(),
        status: await getStatusAsync(),
    }

    return result
}
