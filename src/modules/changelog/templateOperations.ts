import { ChangelogCliArgs } from '../../cli/types/ChangelogCliArgs'
import { Config } from '../../config/types/Config'
import { listCommitsAsync } from '../git/commits/commitProcessor'
import { getCurrentRepositoryAsync } from '../git/context'
import { getCommitCount } from '../git/utils/commitUtils'
import { createSections } from '../sections'
import { renderTemplate } from '../../templates/templateRenderer'
import { collectGitInfo, resolveGitReferences, resolveGitReferencesFromRangeSummary } from '../git/gitOperations'
import { ChangeInformation } from '../changes/types/ChangeInformation'
import { RangeSummary } from '../changes/types/RangeSummary'
import { ReferenceTypesEnum } from '../changes/types/ReferenceTypesEnum'
import { Context } from '../changes/types/Context'
import { GitReference } from '../git/types/GitReference'
import { Repository } from '../git/types/Repository'

export async function getChangeInformation(rangeInfo: RangeSummary): Promise<ChangeInformation> {
    let header: string | null
    let summary: string | null
    let currentReference: GitReference | null
    let changeCommitsCount = await getCommitCount(rangeInfo.resolvedRange)

    currentReference = rangeInfo.latestReference

    header = currentReference?.name ?? null

    if (currentReference) {
        if (currentReference?.reference != rangeInfo.resolvedTo.reference) {
            const commitsAhead = await getCommitCount(`${currentReference?.reference}..${rangeInfo.resolvedTo.reference}`)
            header += ` (+${commitsAhead} commits)`
        }
    }

    // if (resolvedTo.type === ReferenceTypesEnum.commit) {}
    // else if (resolvedTo.type === ReferenceTypesEnum.date) {}
    // else if (resolvedTo.type === ReferenceTypesEnum.branch) {}
    // else if (resolvedTo.type === ReferenceTypesEnum.ref) {}
    // else if (resolvedTo.type === ReferenceTypesEnum.tag) {}

    summary = 'Changes'
    if (rangeInfo.resolvedFrom.value) {
        switch (rangeInfo.resolvedFrom.type) {
            case ReferenceTypesEnum.commit:
                summary += ` from commit ${rangeInfo.resolvedFrom.value}`
                break
            case ReferenceTypesEnum.branch:
                summary += ` from ${rangeInfo.resolvedFrom.value} branch`
                break
            case ReferenceTypesEnum.date:
                summary += ` after ${rangeInfo.resolvedFrom.value}`
                break
            case ReferenceTypesEnum.tag:
                summary += ` from ${rangeInfo.resolvedFrom.value} tag`
                break
            case ReferenceTypesEnum.ref:
                summary += ` from reference ${rangeInfo.resolvedFrom.value}`
                break
            default:
                break
        }
    } else {
        summary += ` from initial commit`
    }
    if (rangeInfo.resolvedTo.value) {
        switch (rangeInfo.resolvedTo.type) {
            case ReferenceTypesEnum.commit:
                summary += ` to commit ${rangeInfo.resolvedTo.value}`
                break
            case ReferenceTypesEnum.branch:
                summary += ` to ${rangeInfo.resolvedTo.value} branch`
                break
            case ReferenceTypesEnum.date:
                summary += ` before ${rangeInfo.resolvedTo.value}`
                break
            case ReferenceTypesEnum.tag:
                summary += ` to ${rangeInfo.resolvedTo.value} tag`
                break
            case ReferenceTypesEnum.ref:
                summary += ` to reference ${rangeInfo.resolvedTo.value}`
                break
            default:
                break
        }
    } else {
        summary += ` to HEAD`
    }

    return {
        header,
        summary,
        currentReference,
        changeCommitsCount,
    }
}

export async function getRangeSummary(resolvedFrom: GitReference, resolvedTo: GitReference): Promise<RangeSummary> {
    const gitInfo = await collectGitInfo(resolvedFrom, resolvedTo)

    const rangeSummary: RangeSummary = {
        ...gitInfo,
        resolvedFrom,
        resolvedTo,
    }

    return rangeSummary
}
export async function renderChangelogTemplate(templatePath: string, options: ChangelogCliArgs, config: Config) {
    let fileData: string = ''
    const date = new Date().toISOString().split('T')[0]
    const repository = await getCurrentRepositoryAsync()
    const { resolvedFrom, resolvedTo } = await resolveGitReferences(options)
    if (!resolvedFrom || !resolvedTo) {
<<<<<<< HEAD
        return fileData
    }
    const rangeSummary = await getRangeSummary(resolvedFrom, resolvedTo)
=======
        console.log('Unable to resolve git references')
        return
    }
    const rangeSummary = await getRangeSummary(resolvedFrom, resolvedTo)
    if(rangeSummary.referenceList.length === 0){
        console.log('No changes found')
        return
    }
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75

    if (options?.mergeAll) {
        const context = await getContext(rangeSummary, config, date, repository)
        fileData = await renderTemplate(templatePath, options?.environment, context)
    } else {
        //burda resolvedTo.type tag ise doğru, commit ise commitList, date ise dateList, branch ise branchList, ref ise refList'te bulunmalı ona göre döngü yapılmalı
        // date ise gün gün commitleri alıp context oluşturup render etmek gerekiyor, veya opsionel olarak config'den alınacak parametreye göre bölünecek birim belirtilmeli
        // branch ise branch'e göre commitleri alıp context oluşturup render etmek gerekiyor
        // ref ise ref'e göre commitleri alıp context oluşturup render etmek gerekiyor, burda kaç ref alınacağı bilgisi bulunmalı
        // commit ise commitList'te bulunan commitlerin hepsini alıp context oluşturup render etmek gerekiyor

        for (let index = 0; index < rangeSummary.referenceList.length; index++) {
            const { resolvedFrom, resolvedTo } = await resolveGitReferencesFromRangeSummary(rangeSummary, index)
            if (!resolvedFrom || !resolvedTo) {
                continue
            }
            const newRangeSummary = await getRangeSummary(resolvedFrom, resolvedTo)
            const context = await getContext(newRangeSummary, config, date, repository)
            const renderedData = await renderTemplate(templatePath, options?.environment, context)
            fileData += `\n\n${renderedData}`
        }
    }

    return fileData
}
async function getContext(rangeSummary: RangeSummary, config: Config, date: string, repository: Repository): Promise<Context> {
    const changeInfo = await getChangeInformation(rangeSummary)

    const commits = await listCommitsAsync(rangeSummary.resolvedRange, config)
    const sections = createSections(commits, config)

    const context: Context = {
        date,
        ...rangeSummary,
        changeInfo,
        repository,
        commits,
        sections,
        config,
    }
    return context
}
