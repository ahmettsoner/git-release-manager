import { CommitType } from '../types/CommitType'
import { GitCommit } from '../types/GitCommit'
import { Mention } from '../types/Mention'
import { Link } from '../types/Link'
import { Note } from '../types/Note'
import { CommitContent } from '../types/CommitContent'
import { Config } from '../../../config/types/Config'
import { createLinkRegex, createMentionRegex } from './regexHandlers'
import { prepareProfileUrlsByEMail } from './profileHandler'

export async function enrichCommit(commit: GitCommit, config: Config): Promise<CommitContent> {
    const match = RegExp(/^(?<type>\w+)(\((?<scope>[^)]+)\))?(?<modifier>[!+~?*])?:\s(?<summary>.+)$/).exec(commit.message)

    const type = match?.groups?.type ?? null
    const scope = match?.groups?.scope ?? null
    const modifier = match?.groups?.modifier ?? null
    const summary = match?.groups?.summary ?? commit.message
    let description = commit.body?.trim() ?? null

    const tagDescription = description?.trim() ?? ''
    const tagRegex = /Tags:\s(.+)/i
    const labels: string[] = []
    const labelsMatch = RegExp(tagRegex).exec(tagDescription)
    if (labelsMatch) {
        labels.push(...labelsMatch[1].split(',').map(label => label?.trim() || ''))
        description = description?.replace(labelsMatch[0], '')?.trim() ?? null
    }

    const mentionDescription = description?.trim() ?? ''
    const mentionRegex = createMentionRegex(config.mentionTypes)
    const mentions: Mention[] = []
    let mentionMatch
    if (mentionRegex) {
        while ((mentionMatch = mentionRegex.exec(mentionDescription)) !== null) {
            const matchedTerm = mentionMatch[0].split(':')[0]?.trim()
            const matchedType = config.mentionTypes.find(mentionType => mentionType.terms.includes(matchedTerm))
            const profileUrl = await prepareProfileUrlsByEMail(mentionMatch[2]?.trim() || '')

            if (matchedType) {
                mentions.push({
                    type: matchedType.type,
                    title: matchedType.title,
                    name: mentionMatch[1]?.trim() || '',
                    email: mentionMatch[2]?.trim() || '',
                    profileUrl,
                })
                description = description?.replace(mentionMatch[0], '')?.trim() ?? null
            }
        }
    }

    const linkDescription = description?.trim() ?? ''
    const linkRegex = createLinkRegex(config.linkTypes)
    const links: Link[] = []
    let linkMatch
    if (linkRegex) {
        while ((linkMatch = linkRegex.exec(linkDescription)) !== null) {
            const matchedTerm = linkMatch[1]?.trim()
            const matchedType = config.linkTypes.filter(linkType => linkType.terms).find(linkType => linkType.terms?.includes(matchedTerm))

            if (matchedType) {
                links.push({
                    type: matchedType.type,
                    title: matchedType.title,
                    id: parseInt(linkMatch[2], 10),
                })
                description = description?.replace(linkMatch[0], '')?.trim() ?? null
            }
        }
    }

    const commitMessage = commit.message?.trim() || ''
    const processedIds = new Set(links.map(link => link.id))
    config.linkTypes.forEach(linkType => {
        if (linkType.sign) {
            const signRegex = new RegExp(`\\${linkType.sign[0]}(\\d+)`)
            let signMatch
            while ((signMatch = signRegex.exec(linkDescription)) !== null) {
                const matchedId = parseInt(signMatch[1], 10)

                if (processedIds.has(matchedId)) {
                    continue
                }

                if (!links.some(link => link.type === linkType.type && link.id === matchedId)) {
                    links.push({
                        type: linkType.type,
                        title: linkType.title,
                        id: matchedId,
                    })
                }

                description = description?.replace(signMatch[0], '')?.trim() ?? null
            }

            while ((signMatch = signRegex.exec(commitMessage)) !== null) {
                const matchedId = parseInt(signMatch[1], 10)

                if (processedIds.has(matchedId)) {
                    continue
                }

                if (!links.some(link => link.type === linkType.type && link.id === matchedId)) {
                    links.push({
                        type: linkType.type,
                        title: linkType.title,
                        id: matchedId,
                    })
                }
            }
        }
    })

    const noteDescription = description?.trim() ?? ''
    const notes: Note[] = []
    const noteRegex = /(.*?):\s(.+)/g
    let noteMatch
    while ((noteMatch = noteRegex.exec(noteDescription)) !== null) {
        notes.push({
            type: noteMatch[1].toLowerCase(),
            content: noteMatch[2],
        })
        description = description?.replace(noteMatch[0], '')?.trim() ?? null
    }

    const typeTitle = getTypeTitle(config.commitTypes, type)

    const profileUrl = await prepareProfileUrlsByEMail(commit.authorEmail)

    const commitContent: CommitContent = {
        type,
        typeTitle,
        scope,
        modifier,
        summary,
        description,
        author: {
            name: commit.authorName,
            email: commit.authorEmail,
            profileUrl,
        },
        mentions,
        links,
        notes,
        labels,
        raw: commit,
        files: [],
    }

    return commitContent
}

export function getTypeTitle(commitTypes: CommitType[], type: string | null): string {
    const matchingType = commitTypes.find(ct => ct.terms.includes(type ?? ''))
    return matchingType ? matchingType.title : 'Other Changes'
}
