import { CliArgs } from "../../types/CliArgs";

export interface BranchListCliArgs extends CliArgs {
    remote?: boolean | string
}
