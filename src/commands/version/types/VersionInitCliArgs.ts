import { CliArgs } from "../../types/CliArgs";

export interface VersionInitCliArgs extends CliArgs {
    version?: string
    note?: string
    noteFile?: string
}
