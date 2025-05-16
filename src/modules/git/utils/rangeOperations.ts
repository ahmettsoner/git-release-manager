import { GitReference } from '../types/GitReference'

export function formatRange(from: GitReference, to: GitReference): string {
    return `${from.reference}..${to.reference}`
}

export function parseRange(range: string): { from: string | null; to: string | null } {
    if (!range) return { from: null, to: null }
    const [from, to] = range.split('..')
    return { from, to }
}
