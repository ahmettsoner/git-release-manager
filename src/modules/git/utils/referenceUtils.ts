import simpleGit from 'simple-git'
import { ReferenceTypesEnum } from '../../changes/types/ReferenceTypesEnum'
import { GitReference } from '../types/GitReference'
import { formatISO8601 } from '../../../utils/date'
import { isGitBranch } from './branchUtils'
import { isGitTag } from './tagUtils'
import { isGitCommit } from './commitUtils'
const git = simpleGit()

/**
 * Resolves a Git reference to its commit hash and associated metadata.
 *
 * @param value - The reference value to resolve. This can be a commit hash, branch name, tag name, or date.
 * @param isStart - Optional flag indicating whether to resolve the reference as the start of a range.
 * @returns A promise that resolves to a `GitReference` object containing the resolved reference details, or `null` if the reference could not be resolved.
 *
 * The function determines the type of the reference (commit, reference, date, tag, or branch) and resolves it accordingly.
 * If the reference is `null`, it resolves to the first or last commit based on the `isStart` flag.
 * If the reference is a date, it resolves to the first or last commit after or before the date, respectively.
 * If the reference is a branch, it validates the branch and resolves to the first or last commit in the branch based on the `isStart` flag.
 *
 * @throws Will throw an error if the reference type is unsupported or if the reference could not be resolved.
 */
export async function resolveReference(value: string | null, isStart?: boolean): Promise<GitReference | null> {
    let type: ReferenceTypesEnum | undefined
    let reference: string | null = null

    if (!value) {
        type = ReferenceTypesEnum.commit
        value = null

        try {
            if (isStart) {
                const logs = await git.log(['--reverse'])
                reference = logs.all.length ? logs.all[0].hash : null
            } else {
                reference = await git.revparse(['HEAD'])
            }
        } catch (error) {
            console.error('Error resolving first/last commit:', error)
            return null
        }
    } else {
        type = await determineType(value)

        try {
            switch (type) {
                case ReferenceTypesEnum.commit:
                case ReferenceTypesEnum.ref:
                    reference = await git.revparse([value])
                    break
                case ReferenceTypesEnum.date: {
                    const formattedDate = formatISO8601(value)
                    if (isStart) {
                        const logsAfter = await git.log(['--after', formattedDate, '--reverse'])
                        reference = logsAfter.all.length ? logsAfter.all[0].hash : null
                    } else {
                        const logsBefore = await git.log(['--before', formattedDate])
                        reference = logsBefore.latest ? logsBefore.latest.hash : null
                    }
                    break
                }
                case ReferenceTypesEnum.tag:
                    reference = await git.revparse([value])
                    break
                case ReferenceTypesEnum.branch: {
                    const isValidBranch = await isGitBranch(value)
                    if (!isValidBranch) {
                        throw new Error(`Invalid branch: ${value}`)
                    }
                    if (isStart) {
                        const logsInBranch = await git.log([value])
                        reference = logsInBranch.all.length ? logsInBranch.all[logsInBranch.all.length - 1].hash : null
                    } else {
                        reference = await git.revparse([value])
                    }
                    break
                }
                default:
                    throw new Error(`Unsupported reference type for: ${value}`)
            }

            if (!reference) {
                throw new Error(`Could not resolve reference: ${value}`)
            }
        } catch (error) {
            console.error(`Error resolving reference: ${value}`, error)
            throw error
        }
    }

    if (!reference) {
        throw new Error('Commit ID is null')
    }
    const result = await git.raw(['show', '-s', '--format=%ci', reference])
    const date = formatISO8601(result.trim())

    return {
        name: reference,
        value,
        type,
        reference,
        date,
    }
}

export async function determineType(value: string): Promise<ReferenceTypesEnum | undefined> {
    const commitRegex = /^[a-f0-9]{7,40}$/i
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/
    const semanticTagRegex = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+(\.[a-zA-Z0-9.-]+)*)?$/
    const refRegex = /^(HEAD(~\d+)?|[a-zA-Z0-9._-]+)$/

    if (RegExp(commitRegex).exec(value) && (await isGitCommit(value))) {
        return ReferenceTypesEnum.commit
    } else if (RegExp(dateRegex).exec(value)) {
        return ReferenceTypesEnum.date
    } else if (semanticTagRegex.test(value) && (await isGitTag(value))) {
        return ReferenceTypesEnum.tag
    } else if (refRegex.test(value)) {
        if (await isGitBranch(value)) {
            return ReferenceTypesEnum.branch
        }
        if (await isGitTag(value)) {
            return ReferenceTypesEnum.tag
        }
        return ReferenceTypesEnum.ref
    }
}
