import { CliArgs } from './CliArgs'

export interface VersionInitCliArgs extends CliArgs {
    version?: string
    note?: string
    noteFile?: string
}
