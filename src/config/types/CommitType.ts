export interface CommitType {
    type: string
    terms: string[]
    title: string
    order: number
    /** Which semver level a commit of this type votes for. Omit = no vote. */
    bump?: 'major' | 'minor' | 'patch'
}
