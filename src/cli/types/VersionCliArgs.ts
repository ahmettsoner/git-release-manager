import { CliArgs } from './CliArgs'

export interface VersionCliArgs extends CliArgs {
    major?: number
    minor?: number
    patch?: number
    channel?: string
    channelNumber?: number
    environment: string
}
