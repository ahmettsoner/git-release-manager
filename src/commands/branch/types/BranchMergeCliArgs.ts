import { CliArgs } from "../../types/CliArgs";

export interface BranchMergeCliArgs extends CliArgs {
    name: string,
    squash: boolean,
}
