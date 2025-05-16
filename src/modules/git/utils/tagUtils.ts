import simpleGit from 'simple-git'
import { Tag } from '../types/Tag'
import { formatISO8601 } from '../../../utils/date'
import { execWithErrorHandling } from '../../../utils/cmd'
import { GitReference } from '../types/GitReference'
import { ReferenceTypesEnum } from '../../changes/types/ReferenceTypesEnum'

const git = simpleGit()

export async function getTags(range: string): Promise<Array<GitReference>> {
    try {
        // Include the commit hash, tag name, and commit date in the format string
        const logCommand = `git log --pretty=format:"%H %ci %D" ${range}`
        const { stdout } = await execWithErrorHandling(logCommand)

        const tagRegex = /^([a-f0-9]{40})\s([\d-]+\s[\d:]+\s[+-]\d{4})\s.*tag: ([^,\s]+)/gm
        const tagsWithRefs: Array<GitReference> = []
        let match

        while ((match = tagRegex.exec(stdout.trim())) !== null) {
            const commitHash = match[1]
            const commitDate = formatISO8601(match[2])
            const tagName = match[3]

            tagsWithRefs.push({
                name: tagName,
                value: tagName,
                reference: commitHash,
                type: ReferenceTypesEnum.tag,
                date: commitDate,
            })
        }

        return tagsWithRefs
    } catch (error) {
        console.error('Error retrieving tags in range:', error)
        throw error
    }
}
/**
 * Checks if the given value is a valid Git tag.
 *
 * @param value - The value to check against the list of Git tags.
 * @returns A promise that resolves to `true` if the value is a valid Git tag, otherwise `false`.
 */
export async function isGitTag(value: string): Promise<boolean> {
    try {
        const tags = await git.tags()
        return tags.all.includes(value)
    } catch {
        return false
    }
}
