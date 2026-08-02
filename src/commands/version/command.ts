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
        // initVersion() already READS options.prefix to build the initial tag —
        // the CLI simply never offered it, so `version init 1.0.0 --prefix v`
        // died on "unknown option" for a value the engine was waiting for.
        // Prefixes are how independent version LINES coexist in one repo
        // (gear-v1.0.0 alongside plugin-v0.3.2), so init must accept one.
        .option("--prefix <prefix>", "Prefix for this version line (e.g. v, gear-v)")
        .option("--note <message>", "Add a release note during initialization")
        .option(
        "--note-file <path>",
        "Load release notes from a file for initialization"
        )
        .action(async (args: string, commandOptions: VersionInitCliArgs) => {
        // The positional is the version being initialised. The controller is a
        // FLAT flag dispatcher (options.init), so the subcommand layer has to
        // translate — parsing it and not forwarding it is why `version init
        // 1.0.0` silently produced 0.0.0.
        const options = { ...program.opts(), ...commandOptions, init: args };

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
        // NO positional argument is declared, so commander invokes the action as
        // (options, command). The old signature named the FIRST parameter `args`
        // and read the SECOND as the options — which handed it a Command
        // instance, so every flag on this subcommand was silently discarded.
        // Measured: `increment --major --prefix v` produced 0.0.0, unprefixed.
        .action(async (commandOptions: VersionIncrementCliArgs) => {
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
        .action(async (commandOptions: VersionResetCliArgs) => {
        // `reset` declares no options at all, so even with the signature fixed
        // nothing would set the flag the controller dispatches on — the command
        // would fall through to generateNewVersion and cut a version instead of
        // resetting. The subcommand states its own intent.
        const options = { ...program.opts(), ...commandOptions, reset: true };

        const controller = new VersionController()
        await controller.handleVersionCommand(options)
        })
    );
    versionProgram.addCommand(
    new Command()
        .command("list")
        .alias("vl")
        // The description and the argument were copy-pasted from `validate`:
        // this command lists versions, and the controller reads options.list as
        // a COUNT (`list === true ? 10 : parseInt(list)`). Left as-is it asked
        // for a version string and then parsed it as a number.
        .description("List recent versions (most recent first)")
        .addArgument(new Argument("[count]", "How many versions to list (default 10)"))
        // .option('-r, --reverse', 'List versions in reverse order')
        // .option('-t, --tag', 'List versions with tags')
        // .option('-d, --date', 'List versions with dates')
        // .option('-s, --sort', 'Sort versions')
        // .option('-v, --verbose', 'Show detailed version information')
        // .option('-a, --all', 'Show all versions')
        .action(async (args: string | undefined, commandOptions: VersionListCliArgs) => {
        const options = { ...program.opts(), ...commandOptions, list: args ?? true };

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
        .action(async (commandOptions: VersionCompareCliArgs) => {
            // The subcommand spells it --version; the controller dispatches on
            // options.compare. Without the translation the flag landed in
            // options.version, which the controller reads as "use this literal
            // version" — so `compare` would have CUT a tag instead of comparing.
            const options = { ...program.opts(), ...commandOptions, compare: (commandOptions as any).version };

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
        .action(async (commandOptions: VersionProjectCliArgs) => {
            // --path is the subcommand's spelling of the controller's projectPath.
            const options = { ...program.opts(), ...commandOptions, projectPath: (commandOptions as any).path };

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
        const options = { ...program.opts(), ...commandOptions, validate: args };

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
        const options = { ...program.opts(), ...commandOptions, revert: args }

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
        .action(async (commandOptions: VersionRemoteCliArgs) => {
            const options = { ...program.opts(), ...commandOptions }
    
            const controller = new VersionController()
            await controller.handleVersionCommand(options)
        })
    );


    return versionProgram;
}