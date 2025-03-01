import { Option, Argument, Command } from "commander";
import { BranchController } from "../../modules/branch/BranchController";
import { BranchCreateCliArgs } from "./types/BranchCreateCliArgs";
import { BranchDeleteCliArgs } from "./types/BranchDeleteCliArgs";
import { BranchMergeCliArgs } from "./types/BranchMergeCliArgs";
import { BranchSwitchCliArgs } from "./types/BranchSwitchCliArgs";
import { BranchProtectCliArgs } from "./types/BranchProtectCliArgs";
import { BranchUnProtectCliArgs } from "./types/BranchUnProtectCliArgs";
import { BranchRebaseCliArgs } from "./types/BranchRebaseCliArgs";
import { BranchListCliArgs } from "./types/BranchListCliArgs";

const branchTypes = [
    { name: "release", prefix: "release/" },
    { name: "hotfix", prefix: "hotfix/" },
    { name: "feature", prefix: "feature/" },
    { name: "custom", prefix: "custom/" },
    ];


export function createBranchCommand(program: Command) :Command {

    const createBranchSubcommand = (type: string, prefix: string) => {
    return new Command(type)
        .description(`Create and manage ${type} branches`)
        .argument("<name>", `Name of the ${type} branch`)
        .action(async (commandOptions) => {
        const options = { ...program.opts(), ...commandOptions };
        if (options[type]) {
            options.branchName = `${prefix}${options[type]}`;
            console.log(`Creating ${type} branch: ${options.branchName}`);

            const controller = new BranchController()
            await controller.handleCreateCommand(options)
        }
        });
    };

    const programBranch = program
    .command("branch")
    .alias("b")
    .description("Manage different types of git branches")
    programBranch.addCommand(
        new Command()
        .command("create")
        .alias("c")
        .description("Create a new branch")
        .addArgument(new Argument("<name>", "branch to create"))
        .addOption(new Option('--push', 'Push branch to remote'))
        .action(async (args: string, commandOptions: BranchCreateCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleCreateCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("delete")
        .alias("d")
        .description("Delete a given branch")
        .argument("<name>", "Name of the branch to delete")
        .addOption(new Option('--push', 'Push branch to remote'))
        .action(async (args: string, commandOptions: BranchDeleteCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args
            
            const controller = new BranchController()
            await controller.handleDeleteCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("merge")
        .alias("m")
        .description("Merge a branch into the current branch")
        .argument("<name>", "Name of the branch to be merged")
        .action(async (args:string, commandOptions: BranchMergeCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleMergeCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("switch")
        .alias("s")
        .description("Switch to branch")
        .addArgument(new Argument("<name>", "branch to switch"))
        .action(async (args:string, commandOptions: BranchSwitchCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleSwitchCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("protect")
        .alias("p")
        .description("Protect a branch from direct commits")
        .argument("<name>", "Name of the branch to protect")
        .action(async (args: string, commandOptions: BranchProtectCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleProtectCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("unprotect")
        .description("Remove protection from a branch")
        .argument("<name>", "Name of the branch to unprotect")
        .action(async (args: string, commandOptions: BranchUnProtectCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleUnProtectCommand(options)
        })
    )
    programBranch  .addCommand(
        new Command()
        .command("rebase")
        .alias("r")
        .description("Rebase the current branch onto another specified branch")
        .argument("<branchName>", "Name of the branch to rebase onto")
        .action(async (args:string, commandOptions: BranchRebaseCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };
            options.name = args

            const controller = new BranchController()
            await controller.handleRebaseCommand(options)
        })
    )


    programBranch.addCommand(
    new Command()
        .command("list")
        .alias("l")
        .description("List all branches with filtering options")
        .option("-l, --latest", "Display the latest branch only")
        .option("-c, --count [count]", "List versions up to a count")
        // .option('-r, --reverse', 'List versions in reverse order')
        // .option('-t, --tag', 'List versions with tags')
        // .option('-d, --date', 'List versions with dates')
        // .option('-s, --sort', 'Sort versions')
        // .option('-v, --verbose', 'Show detailed version information')
        // .option('-a, --all', 'Show all versions')
        .action(async (args: string, commandOptions: BranchListCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new BranchController()
        await controller.handleListCommand(options)
        })
    );

    branchTypes.forEach((type) => {
    programBranch.addCommand(createBranchSubcommand(type.name, type.prefix));
    });


    //   programBranch  .addCommand(
    //     new Command()
    //       .command("remote")
    //       .description("Synchronize version with remote tags and update remote")
    //       // .option('--sync', 'Sync versions with remote')
    //       // .option('--push', 'Push changes and tags to remote')
    //       // .option('--draft', 'Create draft release')
    //       .action(async (commandOptions: VersionRemoteCliArgs) => {
    //         console.log(`Comparing version: ${commandOptions.draft}`);
    //       })
    //   )
    //   // .option('--release <version>', 'Create a release branch (release/{version})')
    //   // .option('--hotfix <version>', 'Create a hotfix branch (hotfix/{version})')
    //   // .option('--feature <name>', 'Create a feature branch (feature/{name})')
    //   // .option('--finish [branchName]', 'Finish a feature/release/hotfix branch')
    //   .action(async (commandOptions: BranchCliArgs) => {
    //     const options = { ...program.opts(), ...commandOptions };
    //     branchRun(options);
    //   });

    return programBranch;
}