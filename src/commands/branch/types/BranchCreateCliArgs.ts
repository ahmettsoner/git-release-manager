import { CliArgs } from "../../types/CliArgs";

export interface BranchCreateCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
