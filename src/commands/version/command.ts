import { Argument, Command } from "commander";
import { VersionInitCliArgs } from "./types/VersionInitCliArgs";
import { VersionController } from "../../modules/version/VersionController";
import { VersionIncrementCliArgs } from "./types/VersionIncrementCliArgs";
import { VersionSetCliArgs } from "./types/VersionSetCliArgs";
import { VersionResetCliArgs } from "./types/VersionResetCliArgs";
import { VersionListCliArgs } from "./types/VersionListCliArgs";
import { VersionCompareCliArgs } from "./types/VersionCompareCliArgs";
import { VersionProjectCliArgs } from "./types/VersionProjectCliArgs";
import { VersionValidateCliArgs } from "./types/VersionValidateCliArgs";
import { VersionRevertCliArgs } from "./types/VersionRevertCliArgs";
import { VersionRemoteCliArgs } from "./types/VersionRemoteCliArgs";

export function createVersionCommand(program: Command) :Command {

    const versionProgram = program
    .command("version")
    .alias('v')
    .description("Comprehensive version and release management operations");

    versionProgram.addCommand(
    new Command()
        .command("init")
        .alias("vin")
        .description("Initialize the project version")
        .addArgument(new Argument("<version>", "Version to initialize"))
        .option("--note <message>", "Add a release note during initialization")
        .option(
        "--note-file <path>",
        "Load release notes from a file for initialization"
        )
        .action(async (args: string, commandOptions: VersionInitCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("increment")
        .alias("vi")
        .description("Increment the project version based on semantic versioning")
        .option("-m, --major", "Increment the major version number")
        .option("-i, --minor", "Increment the minor version number")
        .option("-p, --patch", "Increment the patch version number")
        .option('-c, --channel <channel>', "Specify prerelease channel (e.g., alpha, beta)")
        .option("--prefix <prefix>", "Add a prefix to the version number")
        .option("--prerelease <identifier>", "Add a prerelease identifier")
        .option("--build <identifier>", "Add build metadata")
        .option("--no-channel-number", "Exclude channel number")
        .option("--note <message>", "Add a release note")
        .option("--note-file <path>", "Load release notes from a file")
        .action(async (args: string, commandOptions: VersionIncrementCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("set")
        .alias("vs")
        .description("Explicitly set the project version")
        .addArgument(new Argument("<version>", "Version to set"))
        .option("--note <message>", "Add a release note while setting the version")
        .option(
        "--note-file <path>",
        "Load release notes from a file for setting the version"
        )
        .action(async (args: string, commandOptions: VersionSetCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };
        options.version = args;

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("reset")
        .alias("vr")
        .description("Reset the project version to initial state")
        .action(async (args: string, commandOptions: VersionResetCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("list")
        .alias("vl")
        .description("Check if a version string is valid")
        .addArgument(new Argument("<version>", "Version string to validate"))
        // .option('-r, --reverse', 'List versions in reverse order')
        // .option('-t, --tag', 'List versions with tags')
        // .option('-d, --date', 'List versions with dates')
        // .option('-s, --sort', 'Sort versions')
        // .option('-v, --verbose', 'Show detailed version information')
        // .option('-a, --all', 'Show all versions')
        .action(async (args: string, commandOptions: VersionListCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("compare")
        .alias("vc")
        .description("Compare a specific version with the current/latest one")
        .option("--version <version>", "Version to compare against the latest")
        .action(async (args: string, commandOptions: VersionCompareCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("project")
        .alias("vp")
        .description("Manage project version synchronization with local resources")
        .option("--path <path>", "Specify the project file or folder path")
        .option("-d, --detect", "Detect the current version from the project")
        .option(
        "-u, --update [version]",
        "Update version in project to specified value"
        )
        .action(async (args: string, commandOptions: VersionProjectCliArgs) => {
            const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("validate")
        .alias("vv")
        .description("Check if a version string is valid")
        .addArgument(new Argument("<version>", "Version string to validate"))
        .action(async (args: string, commandOptions: VersionValidateCliArgs) => {
        const options = { ...program.opts(), ...commandOptions };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("revert")
        .alias("vrev")
        .description("Revert the project to a specific version")
        .addArgument(new Argument("<version>", "Version to revert to"))
        .action(async (args: string, commandOptions: VersionRevertCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("remote")
        .description("Synchronize version with remote repositories")
        .option("--sync", "Sync versions with remote repository")
        .option("--push", "Push local changes and tags to remote")
        .option("--draft", "Create a draft release")
        .action(async (args: string, commandOptions: VersionRemoteCliArgs) => {
            const options = { ...program.opts(), ...commandOptions }
    
            const controller = new VersionController()
            await controller.handleVersionCommand(options)
        })
    );


    return versionProgram;
}