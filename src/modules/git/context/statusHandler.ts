import { execWithErrorHandling } from '../../../utils/cmd'
import { StatusInfo } from '../types/StatusInfo'

export async function getStatusAsync(): Promise<StatusInfo> {
    const [{ stdout: modifiedFiles }, { stdout: untrackedFiles }] = await Promise.all([
        execWithErrorHandling('git diff --name-only'),
        execWithErrorHandling('git ls-files --others --exclude-standard'),
    ])

    return {
        modifiedFiles: cleanList(modifiedFiles),
        untrackedFiles: cleanList(untrackedFiles),
    }
}

const cleanList = (output: string | undefined): string[] =>
    output
        ?.split('\n')
        .map(line => line.trim())
        .filter(Boolean) || []
