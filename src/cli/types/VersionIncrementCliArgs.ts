import { CliArgs } from './CliArgs'

export interface VersionIncrementCliArgs extends CliArgs {
    major?: boolean
    minor?: boolean
    patch?: boolean
    channel?: string
    channelNumber?: boolean
    prefix?: string
    prerelease?: string
    build?: string
    note?: string
    noteFile?: string
}
