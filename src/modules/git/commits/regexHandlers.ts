import { CommitType } from '../../../config/types/CommitType'
import { LinkType } from '../../../config/types/LinkType'
import { MentionType } from '../../../config/types/MentionType'

export function createCommitMessageRegex(commitTypes: CommitType[]): RegExp | null {
    if (!commitTypes?.length) return null
    const types = commitTypes.flatMap(commitType => commitType.terms)
    const joinedTypes = types.map(type => type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return new RegExp(`^(${joinedTypes})(\\(.+\\))?[!+~?*]?:\\s.+$`)
}

export function createLinkRegex(linkTypes: LinkType[]): RegExp | null {
    if (!linkTypes?.length) return null
    const terms = linkTypes.filter(linkType => linkType.terms).flatMap(linkType => linkType.terms || [])
    const joinedTerms = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return new RegExp(`(${joinedTerms}):?\\s#?(\\d+)`, 'gi')
}

export function createMentionRegex(mentionTypes: MentionType[]): RegExp | null {
    if (!mentionTypes?.length) return null
    const terms = mentionTypes.flatMap(mentionType => mentionType.terms)
    const joinedTerms = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return new RegExp(`(?:${joinedTerms}):\\s(.+)\\s<(.+)>`, 'gi')
}
