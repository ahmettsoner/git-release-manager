import { CliArgs } from "../../types/CliArgs";

export interface BranchDeleteCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
