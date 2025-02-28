import { CliArgs } from './CliArgs'

export interface BranchDeleteCliArgs extends CliArgs {
    name: string,
    push: boolean,
}
