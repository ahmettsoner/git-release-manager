import { CliArgs } from './CliArgs'

export interface BranchCreateCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
