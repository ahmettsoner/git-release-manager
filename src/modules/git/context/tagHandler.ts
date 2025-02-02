import { TagInfo } from '../types/TagInfo'
import { Tag } from '../types/Tag'
import { execWithErrorHandling } from '../../../utils/cmd'

export async function getTagsAsync(): Promise<TagInfo> {
    const { stdout: allTagsOutput } = await execWithErrorHandling('git tag')

    const allTags = cleanList(allTagsOutput)

    const all: Tag[] = await Promise.all(allTags.map(getTagDetail))
    const latest = all.length > 0 ? all[all.length - 1] : null

    return {
        latest,
        all,
    }
}

const cleanList = (output: string | undefined): string[] =>
    output
        ?.split('\n')
        .map(line => line.trim())
        .filter(Boolean) || []

async function getTagDetail(tag: string): Promise<Tag> {
    try {
        const command = `git show ${tag} --no-patch --pretty=format:"%h %ai"`;
        const { stdout } = await execWithErrorHandling(command)
        const [reference, date] = stdout.split(' ', 2)
        return { name: tag, reference, date }
    } catch (error) {
        console.error(`Error getting details for tag ${tag}:`, error)
        throw error
    }
}
