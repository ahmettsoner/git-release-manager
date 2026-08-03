import { CliArgs } from "../../types/CliArgs";

export interface BranchFinishCliArgs extends CliArgs {
    name?: string,
    push?: boolean,
}
