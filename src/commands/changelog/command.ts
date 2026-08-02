import { Command, Option } from "commander";
import { readConfig } from "../../config/configManager";
import { ChangelogController } from "../../modules/changelog/ChangelogController";
import { ChangelogGenerateCliArgs } from "./types/ChangelogGenerateCliArgs";
import { ChangelogCliArgs } from "./types/ChangelogCliArgs";

export function createChangelogCommand(program: Command) :Command {

    // ── The FLAT option surface on the parent command ─────────────────────
    //
    // `changelog generate --from <ref>` and `changelog --from <ref>` are the
    // same operation. Only the first was reachable: the parent command declared
    // no options, so the second answered "unknown option '--from'".
    //
    // Both spellings now build the same options object and hand it to the same
    // ChangelogController.handleGenerateCommand, which passes it to
    // renderChangelogTemplate → resolveGitReferences, where `from` is read and
    // resolved into the range the changelog is rendered over. One code path, so
    // the two spellings cannot answer differently.
    const changelogProgram = program
    .command("changelog")
    .alias("ch")
    .description("Changelog helper")
    .option("-f, --from <ref>", "Start reference point (commit, tag, branch, or date)")
    .option("-t, --to <ref>", "End reference point (commit, tag, branch, or date)")
    .option("-r, --range <range>", "Specify a range of references")
    .option("-p, --point <commit | tag | branch | date | reference>", "Specify a single reference")
    .option("--template <path>", "Path to a custom template file")
    .option("-o, --output <path>", "Path to output the changelog")
    .option("--dry-run", "Preview the changelog generation without writing")
    .addOption(new Option("-m, --merge-all", "Merge all changes into a single output").default(false))
    .action(async (commandOptions: ChangelogCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals() } as ChangelogCliArgs;

        const config = await readConfig(options?.config, options.environment)
        const controller = new ChangelogController()
        await controller.handleGenerateCommand(options, config)
    });

    changelogProgram.addCommand(
    new Command()
        .command("generate")
        .alias("g")
        .description("Generate a changelog from commit history")
        .option(
        "-f, --from <ref>",
        "Start reference point (commit, tag, branch, or date)"
        )
        .option(
        "-t, --to <ref>",
        "End reference point (commit, tag, branch, or date)"
        )
        .option("-r, --range <range>", "Specify a range of references")
        .option(
        "-p, --point <commit | tag | branch| date | reference>",
        "Specify a single reference"
        )
        .option("--template <path>", "Path to a custom template file")
        .option("-o, --output <path>", "Path to output the changelog")
        .option("--dry-run", "Preview the changelog generation without writing")
        .addOption(new Option("-m, --merge-all", "Merge all changes into a single output").default(false))
        .action(async (commandOptions: ChangelogGenerateCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals() } as ChangelogCliArgs;

        const config = await readConfig(options?.config, options.environment)
        const controller = new ChangelogController()
        await controller.handleGenerateCommand(options, config)
        })
    );

    return changelogProgram;
}
