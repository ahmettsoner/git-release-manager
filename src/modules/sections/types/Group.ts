import { CommitContent } from '../../git/types/CommitContent'

export interface Group {
    title: string
    files: string[]
    commits: CommitContent[]
}
