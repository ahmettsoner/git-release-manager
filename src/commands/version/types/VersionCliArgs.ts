import { CliArgs } from "../../types/CliArgs";

export interface VersionCliArgs extends CliArgs {
    init?: string
    version?: string
    reset?: boolean
    major?: boolean
    minor?: boolean
    patch?: boolean
    channel?: string
    channelNumber?: boolean
    prefix?: string
    prerelease?: string
    projectPath?: string;
    detect?: boolean;
    update?: string | boolean;
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
}
