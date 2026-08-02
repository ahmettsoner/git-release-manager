import { ChangelogCliArgs } from "./ChangelogCliArgs";

/**
 * `changelog generate` is the same option shape as `changelog`, with the three
 * fields the subcommand always supplies narrowed to required.
 */
export interface ChangelogGenerateCliArgs extends ChangelogCliArgs {
    mergeAll: boolean
    template: string
    output: string
}
