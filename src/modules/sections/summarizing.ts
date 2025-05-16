import { SectionSummary } from './types/SectionSummary'
import { Config } from '../../config/types/Config'
import { Contributor } from './types/Contributor'

export function summarizeCommits(commits: SectionSummary[], config: Config): any[] {
    if (!Array.isArray(commits)) {
        throw new Error('Invalid input: commits must be an array')
    }

    const result: any[] = []

    const summary = commits.reduce<Record<string, any>>((acc, commit) => {
        const type = commit.type
        if (!acc[type]) {
            const matchingType = config.commitTypes.find(ct => ct.type === type)
            const typeTitle = matchingType ? matchingType.title : 'Other Changes'
            const order = matchingType?.order !== undefined ? matchingType.order : Number.MAX_SAFE_INTEGER

            acc[type] = {
                type: type,
                title: typeTitle,
                count: commit.items.length,
                order: order,
            }
        }

        return acc
    }, {})

    result.push(...Object.values(summary))

    result.sort((a, b) => a.order - b.order)

    return result
}

export function summarizeNotes(notes: SectionSummary[], config: Config): any[] {
    if (!Array.isArray(notes)) {
        throw new Error('Invalid input: notes must be an array')
    }

    const result: any[] = []

    const summary = notes.reduce<Record<string, any>>((acc, note) => {
        const type = note.type
        if (!acc[type]) {
            const matchingType = config.noteTypes.find(nt => nt.type === type)
            const typeTitle = matchingType ? matchingType.title : 'Other Notes'
            const order = matchingType?.order !== undefined ? matchingType.order : Number.MAX_SAFE_INTEGER

            acc[type] = {
                type: type,
                title: typeTitle,
                count: note.items.length,
                order: order,
            }
        }

        return acc
    }, {})

    result.push(...Object.values(summary))

    result.sort((a, b) => a.order - b.order)

    return result
}

export function summarizeContributors(contributors: Contributor[], config: Config): any[] {
    if (!Array.isArray(contributors)) {
        throw new Error('Invalid input: contributors must be an array')
    }

    const result: any[] = []

    const summary = contributors.reduce<Record<string, any>>((acc, contributor) => {
        const type = contributor.email
        if (!acc[type]) {
            acc[type] = {
                email: contributor.email,
                name: contributor.name,
                profileUrl: contributor.profileUrl,
                count: contributor.groups?.length ?? 0,
            }
        }

        return acc
    }, {})

    result.push(...Object.values(summary))

    return result
}
