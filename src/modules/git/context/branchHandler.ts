import { execWithErrorHandling } from '../../../utils/cmd'
import { BranchInfo } from '../types/BranchInfo'

export async function getBranchesAsync(): Promise<BranchInfo> {
    const [{ stdout: current }, { stdout: merged }, { stdout: unmerged }] = await Promise.all([
        execWithErrorHandling('git branch --show-current'),
        execWithErrorHandling('git branch --merged'),
        execWithErrorHandling('git branch --no-merged'),
    ])

    return {
        current: current.trim(),
        merged: cleanList(merged),
        unmerged: cleanList(unmerged),
    }
}

const cleanList = (output: string | undefined): string[] =>
    output
        ?.split('\n')
        .map(line => line.trim())
        .filter(Boolean) || []
