import { GitReference } from './types/GitReference'
import { ChangelogCliArgs } from '../../cli/types/ChangelogCliArgs'
import { formatRange, parseRange } from './utils/rangeOperations'
import { resolveReference } from './utils/referenceUtils'
import { getCommitCount } from './utils/commitUtils'
import { getTags } from './utils/tagUtils'
import { RangeSummary } from '../changes/types/RangeSummary'

export async function resolveGitReferences(options?: ChangelogCliArgs): Promise<{ resolvedFrom: GitReference | null; resolvedTo: GitReference | null }> {
    let resolvedFrom: GitReference | null
    let resolvedTo: GitReference | null

    if (options?.range) {
        const { from: f, to: t } = parseRange(options.range)
        resolvedFrom = await resolveReference(f, true)
        resolvedTo = await resolveReference(t, false)
    } else if (options?.point) {
        resolvedFrom = await resolveReference(null, true)
        resolvedTo = await resolveReference(options.point, false)
    } else {
        resolvedFrom = await resolveReference(options?.from ?? null, true)
        resolvedTo = await resolveReference(options?.to ?? null, false)
    }

    return { resolvedFrom, resolvedTo }
}
export async function resolveGitReferencesFromRangeSummary(rangeInfo: RangeSummary, index: number): Promise<{ resolvedFrom: GitReference | null; resolvedTo: GitReference | null }> {
    let resolvedFrom: GitReference | null
    let resolvedTo: GitReference | null

    const tag = rangeInfo.referenceList[index]
    if (rangeInfo.referenceList[rangeInfo.referenceList.length - 1].reference == tag.reference) {
        resolvedFrom = rangeInfo.resolvedFrom
        resolvedTo = await resolveReference(tag.name, false)
    } else if (rangeInfo.referenceList[0].reference == tag.reference) {
        const previousTag = rangeInfo.referenceList[index + 1]
        resolvedFrom = await resolveReference(previousTag.name, true)
        resolvedTo = rangeInfo.resolvedTo
    } else {
        const previousTag = rangeInfo.referenceList[index + 1]
        resolvedFrom = await resolveReference(previousTag.name, true)
        resolvedTo = await resolveReference(tag.name, false)
    }

    return { resolvedFrom, resolvedTo }
}

export interface GitInfo {
    resolvedRange: string
    commitCount: number
    referenceList: Array<GitReference>
    latestReference: GitReference | null
}

export async function collectGitInfo(from: GitReference, to: GitReference) : Promise<GitInfo> {
    const resolvedRange = formatRange(from, to)
    const commitCount = await getCommitCount(resolvedRange)
    const referenceList = await getTags(resolvedRange)
    const latestReference = referenceList.length > 0 ? referenceList[0] : null

    return { resolvedRange, commitCount, referenceList, latestReference }
}
