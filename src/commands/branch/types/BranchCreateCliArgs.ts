import { CliArgs } from "../../types/CliArgs";

export interface BranchCreateCliArgs extends CliArgs {
    name: string
    basedOn: string
    switch?: boolean
}
