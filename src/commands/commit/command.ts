import { Command } from "commander";
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
        .option("-m, --message <message>", "Specify the commit message")
        .option("-b, --body <lines...>", "Add commit body text")
        .option("-t, --type <type>", "Specify commit type (e.g., feat, fix, chore)")
        .option(
        "-s, --scope <scope>",
        "Specify commit scope (e.g., module or component)"
        )
        // .option("-a, --all", "Stage all modified and deleted files for commit")
        // .option(
        //   "-f, --file <files...>",
        //   "Specify individual files to stage and commit"
        // )
        .option('--stage <files...>', 'Files to add or "all"/"empty"', 'all')
        .option("--dry-run", "Show what would be committed without committing")
        .option("--no-verify", "Skip pre-commit and commit-msg hooks")
        .option("-i, --sign", "Sign the commit with a GPG key")
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