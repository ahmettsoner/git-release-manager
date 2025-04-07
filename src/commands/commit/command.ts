import { Command, Option } from "commander";
import { readConfig } from "../../config/configManager";
import { CommitController } from "../../modules/commit/CommitController";
import { CommitCreateCliArgs } from "./types/CommitCreateCliArgs";
import { CommitListCliArgs } from "./types/CommitListCliArgs";
import { CommitAmendCliArgs } from "./types/CommitAmendCliArgs";

export function createCommitCommand(program: Command) :Command {

    const commitProgram = program
    .command("commit")
    .alias("c")
    .description("Operations related to git commits");

    commitProgram.addCommand(
    new Command()
        .command("create")
        .alias("c")
        .description("Create a new commit with staged changes")
        .addOption(new Option('--stage <files...>', 'Files to add or "all"/"empty"').default('all'))
        .addOption(new Option("-m, --message <message>", "Specify the commit message"))
        .addOption(new Option("-b, --body <lines...>", "Add commit body text"))
        .addOption(new Option("-t, --type <type>", "Specify commit type (e.g., feat, fix, chore)"))
        .addOption(new Option(
        "-s, --scope <scope>",
        "Specify commit scope (e.g., module or component)"
        ))
        .addOption(new Option("--dry-run", "Show what would be committed without committing"))
        .addOption(new Option("--no-verify", "Skip pre-commit and commit-msg hooks"))
        .addOption(new Option("-i, --sign", "Sign the commit with a GPG key"))
        .action(async (args: string, commandOptions: CommitCreateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const config = await readConfig(options?.config, options.environment)
        const controller = new CommitController()
        await controller.handleCreateCommand(options, config)
        })
    );
    commitProgram.addCommand(
    new Command()
        .command("list")
        .alias("l")
        .description("List recent commits with options to filter")
        .option("-c, --count <number>", "Number of commits to list")
        .action(async (args: string, commandOptions: CommitListCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const config = await readConfig(options?.config, options.environment)
        const controller = new CommitController()
        await controller.handleListCommand(options, config)
        })
    );
    commitProgram.addCommand(
    new Command()

        .command("amend")
        .alias("a")
        .description("Amend the previous commit")
        .action(async (args: string, commandOptions: CommitAmendCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const config = await readConfig(options?.config, options.environment)
        const controller = new CommitController()
        await controller.handleAmendCommand(options, config)
        })
    );

    return commitProgram;
}