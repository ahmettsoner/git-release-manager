import { CliArgs } from "../../types/CliArgs";

export interface VersionListCliArgs extends CliArgs {
    count?: number
    latest?: boolean
}
