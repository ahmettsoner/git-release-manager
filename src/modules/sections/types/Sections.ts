import { Contributor } from './Contributor'
import { SectionSummary } from './SectionSummary'

export interface Sections {
    commits: SectionSummary[]
    notes: SectionSummary[]
    contributors: Contributor[]
    summary: {
        commits: any[]
        notes: any[]
        contributors: any[]
    }
}
