import { CommitContent } from '../../git/types/CommitContent'
import { Group } from './Group'

export interface Contributor {
    email: string
    name: string
    profileUrl?: string
    groups?: Group[]
    files?: string[]
    commits?: CommitContent[]
}
