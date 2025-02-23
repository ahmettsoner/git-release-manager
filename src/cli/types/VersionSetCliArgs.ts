import { CliArgs } from './CliArgs'

export interface VersionSetCliArgs extends CliArgs {
    version?: string
    note?: string
    noteFile?: string
}
