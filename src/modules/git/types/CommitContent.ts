import { Author } from './Author'
import { GitCommit } from './GitCommit'
import { Link } from './Link'
import { Mention } from './Mention'
import { Note } from './Note'

export interface CommitContent {
    type: string | null
    typeTitle: string
    scope: string | null
    modifier: string | null
    summary: string
    description: string | null
    author: Author
    mentions: Mention[]
    links: Link[]
    notes: Note[]
    labels: string[]
    raw: GitCommit
    files: string[]
}
