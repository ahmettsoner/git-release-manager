import { BranchInfo } from './BranchInfo'
import { CommitInfo } from './CommitInfo'
import { RemoteInfo } from './RemoteInfo'
import { StatusInfo } from './StatusInfo'
import { TagInfo } from './TagInfo'

export interface Repository {
    name: string
    path: string
    remote: RemoteInfo | null
    branches: BranchInfo
    tags: TagInfo
    commits: CommitInfo
    status: StatusInfo
}
