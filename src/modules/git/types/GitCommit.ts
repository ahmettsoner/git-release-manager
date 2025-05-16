export interface GitCommit {
    hash: string
    shortHash: string
    message: string
    body?: string
    authorName: string
    authorEmail: string
    date: string
}
