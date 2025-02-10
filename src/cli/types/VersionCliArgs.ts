import { CliArgs } from './CliArgs'

export interface VersionCliArgs extends CliArgs {
    init?: string
    reset?: boolean
    major?: boolean
    minor?: boolean
    patch?: boolean
    channel?: string
<<<<<<< HEAD
    noChannelNumber?: boolean
    prefix?: string
    prerelease?: string
=======
    channelNumber?: boolean
    prefix?: string
    prerelease?: string
    detect?: string | boolean;
    update?: string | boolean;
>>>>>>> 387c6690752839abcec80de9928319b09a2a4c75
    build?: string
    list?: boolean
    latest?: boolean
    tag?: boolean
    push?: boolean
    draft?: boolean
    note?: string
    noteFile?: string
    compare?: string
    revert?: string
    validate?: string
    branch?: boolean
    sync?: boolean
    environment: string
}
