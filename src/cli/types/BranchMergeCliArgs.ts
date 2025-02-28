import { CliArgs } from './CliArgs'

export interface BranchMergeCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
