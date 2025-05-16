import { Config } from '../../config/types/Config'
import { CommitContent } from '../git/types/CommitContent'
import { getContributors } from './contributors'
import { groupBy, groupByNotes } from './grouping'
import { summarizeCommits, summarizeContributors, summarizeNotes } from './summarizing'
import { Sections } from './types/Sections'

export function createSections(commits: CommitContent[], config: Config): Sections {
    const sections: Partial<Sections> = {}
    sections.commits = groupBy(commits, 'type', config)
    sections.notes = groupByNotes(commits, config, false)
    sections.contributors = getContributors(commits, config)
    sections.summary = {
        commits: summarizeCommits(sections.commits, config),
        notes: summarizeNotes(sections.notes, config),
        contributors: summarizeContributors(sections.contributors, config),
    }
    return sections as Sections
}
