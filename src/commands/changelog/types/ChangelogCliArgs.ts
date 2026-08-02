import { CliArgs } from "../../types/CliArgs";

/**
 * The changelog option shape, declared ONCE.
 *
 * This interface used to be empty while `ChangelogGenerateCliArgs` carried the
 * fields, so the top-level `changelog` command had nothing to declare and no
 * way to describe what it accepted — `changelog --from <ref>` died on "unknown
 * option" against an engine that reads `options.from` in
 * modules/git/gitOperations.ts::resolveGitReferences.
 *
 * The reading side (resolveGitReferences → renderChangelogTemplate →
 * ChangelogController.handleGenerateCommand) is typed against THIS interface,
 * so the field a caller sets and the field the engine reads cannot drift apart.
 */
export interface ChangelogCliArgs extends CliArgs {
    from?: string
    to?: string
    point?: string
    range?: string
    mergeAll?: boolean
    template?: string
    output?: string
    dryRun?: boolean
}
