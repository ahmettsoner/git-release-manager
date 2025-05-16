import { Config } from '../../../config/types/Config'
import { CommitContent } from '../../git/types/CommitContent'
import { Repository } from '../../git/types/Repository'
import { Sections } from '../../sections/types/Sections'
import { ChangeInformation } from './ChangeInformation'
import { RangeSummary } from './RangeSummary'

export interface Context extends RangeSummary {
    date: string
    changeInfo: ChangeInformation
    repository: Repository
    commits: CommitContent[]
    sections: Sections
    config: Config
}
