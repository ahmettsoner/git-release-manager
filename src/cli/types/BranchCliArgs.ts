import { CliArgs } from './CliArgs'

export interface BranchCliArgs extends CliArgs {
    create?: string
    delete?: string
    list?: boolean
    switch?: string
    merge?: string
    environment: string
}
