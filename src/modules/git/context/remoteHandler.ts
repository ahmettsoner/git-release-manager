import { execWithErrorHandling } from '../../../utils/cmd'
import { RemoteInfo } from '../types/RemoteInfo'

export async function getRemoteUrl(): Promise<string> {
    const { stdout: remoteUrl } = await execWithErrorHandling('git config --get remote.origin.url')
    return remoteUrl.trim()
}

export function parseRemoteUrl(remoteUrl: string): RemoteInfo | null {
    if (!remoteUrl) return null
    const match = RegExp(/(?:https?:\/\/|git@)([\w.-]+)(?:[:/])([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i).exec(remoteUrl)
    if (!match) throw new Error(`Could not parse remote URL: ${remoteUrl}`)

    const [_, host, owner, repository] = match
    const repoUrl = `https://${host}/${owner}/${repository}`
    return { url: remoteUrl, host, owner, repository, repoUrl }
}
