import { GitReference } from '../../git/types/GitReference'

export interface RangeSummary {
    resolvedFrom: GitReference
    resolvedTo: GitReference
    resolvedRange: string
    commitCount: number
    referenceList: Array<GitReference>
    latestReference: GitReference | null
}
