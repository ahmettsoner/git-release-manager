import { CliArgs } from './CliArgs'

export interface BranchRebaseCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
