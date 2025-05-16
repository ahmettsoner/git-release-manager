import { ReferenceTypesEnum } from '../../changes/types/ReferenceTypesEnum'

/**
 * Represents a Git reference.
 *
 * @interface GitReference
 *
 * @property {string | null} value - The value of the Git reference, which could be a commit hash, tag name, etc.
 * @property {string | undefined} type - The type of the Git reference, such as 'commit', 'tag', etc.
 * @property {string | null} reference - The reference name, such as a branch name or tag name.
 * @property {string} date - The date associated with the Git reference.
 */

export interface GitReference {
    name: string | null
    value: string | null
    type: ReferenceTypesEnum // The type could be 'commit', 'tag', etc.
    reference: string | null
    date: string
}
