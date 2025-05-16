import { CliArgs } from "../../types/CliArgs";

export interface VersionRemoteCliArgs extends CliArgs {
    sync?: boolean
    push?: boolean
    draft?: boolean
}
