import { RemoteInfo } from '../types/RemoteInfo'


export function parseRemoteUrl(remoteUrl: string): RemoteInfo | null {
    if (!remoteUrl) return null
    const match = RegExp(/(?:https?:\/\/|git@)([\w.-]+)(?:[:/])([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i).exec(remoteUrl)
    if (!match) throw new Error(`Could not parse remote URL: ${remoteUrl}`)

    const [_, host, owner, repository] = match
    const repoUrl = `https://${host}/${owner}/${repository}`
    return { url: remoteUrl, host, owner, repository, repoUrl }
}
