import { CommitContent } from '../git/types/CommitContent'
import { Config } from '../../config/types/Config'
import { SectionSummary } from './types/SectionSummary'

export function groupBy(commits: CommitContent[], key: string, config: Config): SectionSummary[] {
    if (!Array.isArray(commits)) {
        throw new Error('Invalid input: commits must be an array')
    }

    const result: SectionSummary[] = []

    const grouped = commits.reduce<Record<string, SectionSummary>>((acc, commit) => {
        const groupKey = key.split('.').reduce((nested: any, part: string) => nested?.[part], commit)
        
        if (!acc[groupKey]) {
            const matchingType = config.commitTypes.find(ct => ct.terms.includes(groupKey))
            const typeTitle = matchingType ? matchingType.title : 'Other Changes'
            const order = matchingType?.order !== undefined ? matchingType.order : Number.MAX_SAFE_INTEGER

            acc[groupKey] = {
                type: matchingType ? matchingType.type : 'other',
                title: typeTitle,
                order: order,
                items: [],
            }
        }

        acc[groupKey].items.push(commit)
        return acc
    }, {})

    result.push(...Object.values(grouped))

    result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    return result
}

export function groupByNotes(array: CommitContent[], config: Config, includeUnmatched = true): SectionSummary[] {
    if (!Array.isArray(array)) {
        throw new Error('Invalid input: array must be an array')
    }

    const result: SectionSummary[] = []

    const grouped = array.reduce<Record<string, SectionSummary>>((acc, item) => {
        if (!item.notes || item.notes.length === 0) return acc

        item.notes.forEach(note => {
            const groupKey = note.type
            const matchingType = config.noteTypes.find(nt => nt.type === groupKey)

            if (!matchingType && !includeUnmatched) return

            if (!acc[groupKey]) {
                const typeTitle = matchingType ? matchingType.title : groupKey
                const order = matchingType?.order !== undefined ? matchingType.order : Number.MAX_SAFE_INTEGER

                acc[groupKey] = {
                    type: groupKey,
                    title: typeTitle,
                    order: order,
                    items: [],
                }
            }

            acc[groupKey].items.push({
                note,
                commit: item,
            })
        })

        return acc
    }, {})

    result.push(...Object.values(grouped))

    result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    return result
}
