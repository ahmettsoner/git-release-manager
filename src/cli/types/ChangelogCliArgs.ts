import { CliArgs } from './CliArgs'

export interface ChangelogCliArgs extends CliArgs {
    from?: string
    to?: string
    point?: string
    range?: string
    mergeAll: boolean
    template: string
    output: string
}
