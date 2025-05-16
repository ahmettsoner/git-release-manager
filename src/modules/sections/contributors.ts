import { CommitContent } from '../git/types/CommitContent'
import { Config } from '../../config/types/Config'
import { Contributor } from './types/Contributor'
import { Group } from './types/Group'

export function getContributors(commits: CommitContent[], config: Config): Contributor[] {
    const contributors: Record<string, Contributor> = {}

    commits.forEach(commit => {
        const allContributors = [commit.author, ...(commit.mentions || [])]

        allContributors.forEach(contributor => {
            const key = contributor.email

            if (!contributors[key]) {
                contributors[key] = {
                    ...contributor,
                    groups: [],
                    files: [],
                    commits: [],
                }
            }

            const normalizePath = (path: string) => path.replace(/\\/g, '/')

            commit.files.forEach(file => {
                const normalizedFile = normalizePath(file)
                Object.entries(config.fileGroups).forEach(([group, paths]) => {
                    if (paths.some((path: string) => normalizedFile.startsWith(normalizePath(path)))) {
                        let groupObj: Group | undefined = contributors[key].groups?.find((g: Group) => g.title === group)
                        if (!groupObj) {
                            groupObj = { title: group, files: [], commits: [] }
                            contributors[key].groups!.push(groupObj)
                        }
                        if (!groupObj.files.includes(normalizedFile)) {
                            groupObj.files.push(normalizedFile)
                        }
                        if (!groupObj.commits.includes(commit)) {
                            groupObj.commits.push(commit)
                        }
                    }
                })
                if (!contributors[key].files?.includes(normalizedFile)) {
                    contributors[key].files!.push(normalizedFile)
                }
            })

            if (!contributors[key].commits?.includes(commit)) {
                contributors[key].commits!.push(commit)
            }
        })
    })

    return Object.values(contributors)
}
