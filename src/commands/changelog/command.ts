import { Command } from "commander";
import { readConfig } from "../../config/configManager";
import { ChangelogController } from "../../modules/changelog/ChangelogController";
import { ChangelogGenerateCliArgs } from "./types/ChangelogGenerateCliArgs";

export function createChangelogCommand(program: Command) :Command {

    const changelogProgram = program
    .command("changelog")
    .alias("ch")
    .description("Changelog helper");
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
        .option("-m, --merge-all", "Merge all changes into a single output")
        .option("--template <path>", "Path to a custom template file")
        .option("-o, --output <path>", "Path to output the changelog")
        .option("--dry-run", "Preview the changelog generation without writing")
        .action(async (args: string, commandOptions: ChangelogGenerateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const config = await readConfig(options?.config, options.environment)
        const controller = new ChangelogController()
        await controller.handleGenerateCommand(options, config)
        })
    );

    return changelogProgram;
}