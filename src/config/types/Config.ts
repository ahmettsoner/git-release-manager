import { BranchConfig } from './BranchConfig'
import { ChannelType } from './ChannelType'
import { CommitType } from './CommitType'
import { FileGroups } from './FileGroups'
import { LinkType } from './LinkType'
import { MentionType } from './MentionType'
import { NoteType } from './NoteType'
import { Options } from './Options'
import { Repository } from './Repository'

export interface Config {
    appName: string
    output: string
    tag: {
        /**
         * The tag pattern. Declared by the packaged default and read by nothing
         * — recorded here rather than deleted so the next reader does not
         * mistake it for the live knob.
         */
        format?: string
        /**
         * The version line's prefix, e.g. `v`. This IS live: it is the default
         * for `--prefix` on the version path (see VersionController), so a
         * project declares it once instead of passing it on every call.
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
    /** Version-derivation policy. Absent = derive nothing beyond the default. */
    versioning?: {
        /** The level a range falls to when no commit votes. Default: patch. */
        defaultBump?: 'major' | 'minor' | 'patch'
    }
}

export type CommitTypeNames = Config['commitTypes'][number]['type']
export type NoteTypeNames = Config['noteTypes'][number]['type']
export type ChannelNames = keyof Config['channels']
