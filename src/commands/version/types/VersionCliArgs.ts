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
    // boolean = "list the default count"; string = an explicit count. The
    // controller already reads it both ways (`list === true ? 10 :
    // parseInt(list as string)`), so the `as string` cast there was covering for
    // this declaration rather than for a real narrowing.
    list?: boolean | string
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
