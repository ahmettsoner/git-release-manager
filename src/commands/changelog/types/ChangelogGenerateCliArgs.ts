import { CliArgs } from "../../types/CliArgs";

export interface ChangelogGenerateCliArgs extends CliArgs {
    from?: string
    to?: string
    point?: string
    range?: string
    mergeAll: boolean
    template: string
    output: string
    dryRun?: boolean;           // İşlemleri göstermek için
}
