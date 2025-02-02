import { GitReference } from '../../git/types/GitReference'

export interface ChangeInformation {
    header: string | null
    summary: string | null
    currentReference: GitReference | null
    changeCommitsCount: number
}
