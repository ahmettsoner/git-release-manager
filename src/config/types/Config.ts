import { BranchConfig } from './BranchConfig'
import { ChannelType } from './ChannelType'
import { CommitType } from './CommitType'
import { FileGroups } from './FileGroups'
import { Flow } from './Flow'
import { LinkType } from './LinkType'
import { MentionType } from './MentionType'
import { NoteType } from './NoteType'
import { Options } from './Options'
import { Repository } from './Repository'
import { Versioning } from './Versioning'

export interface Config {
    appName: string
    output: string
    tag: {
        /**
         * The version line's prefix, e.g. `v` — the default for `--prefix` on
         * the version path (see VersionController.withConfiguredPrefix), so a
         * project declares it once instead of passing it on every call.
         *
         * This used to sit beside `format`, a regex the packaged default
         * shipped and NOTHING read. A setting a project writes and no code
         * consults is worse than no setting: the next reader assumes the
         * behaviour is configured. It was removed 2026-08-06 rather than
         * documented, because a documented dead key is still a dead key.
         */
        prefix?: string
    }
    channels: {
        [key: string]: ChannelType
    }
    noteTypes: NoteType[]
    commitTypes: CommitType[]
    linkTypes: LinkType[]
    mentionTypes: MentionType[]
    fileGroups: FileGroups
    allowedBranches: string[]
    allowedChannels: string[]
    options: Options
    helpers: any
    template: string
    branchStrategies: Record<string, BranchConfig>;
    repository: Repository
    /**
     * Version-derivation and version-stamping policy. Absent = derive nothing
     * beyond the default and write nothing. See types/Versioning.ts.
     */
    versioning?: Versioning
    /**
     * The release flow a project declares: its phases, each phase's branch, and
     * how the branches move. Absent = no flow verbs; `branchStrategies` still
     * describes the git-flow model for `branch finish`. See types/Flow.ts for
     * why the two are separate declarations.
     */
    flow?: Flow
}

export type CommitTypeNames = Config['commitTypes'][number]['type']
export type NoteTypeNames = Config['noteTypes'][number]['type']
export type ChannelNames = keyof Config['channels']
