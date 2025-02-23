import { CliArgs } from './CliArgs'

export interface VersionListCliArgs extends CliArgs {
    count?: number
    latest?: boolean
}
