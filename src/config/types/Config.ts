import { ChannelType } from './ChannelType'
import { CommitType } from './CommitType'
import { FileGroups } from './FileGroups'
import { LinkType } from './LinkType'
import { MentionType } from './MentionType'
import { NoteType } from './NoteType'
import { Options } from './Options'

export interface Config {
    appName: string
    output: string
    tag: {
        format: string
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
}

export type CommitTypeNames = Config['commitTypes'][number]['type']
export type NoteTypeNames = Config['noteTypes'][number]['type']
export type ChannelNames = keyof Config['channels']
