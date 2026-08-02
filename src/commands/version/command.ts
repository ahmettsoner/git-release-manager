import { Argument, Command } from "commander";
import { VersionInitCliArgs } from "./types/VersionInitCliArgs";
import { VersionCliArgs } from "./types/VersionCliArgs";
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

    // ── The FLAG surface, restored on the parent command ──────────────────
    //
    // The controller (VersionController.handleVersionCommand) is a FLAT flag
    // dispatcher and always has been: it branches on options.init, .major,
    // .minor, .patch, .channel, .detect, .update, .list, .compare, .revert,
    // .validate, .sync. The subcommands added later are a translation veneer
    // over exactly that contract.
    //
    // The parent `version` command carried NO options, so every one of those
    // spellings answered "unknown option" — which is why 92 of the e2e suite's
    // invocations failed against an engine that was perfectly capable of serving
    // them, and why notes/genel.md documents a CLI that could not be run.
    //
    // Both spellings now reach the same controller with the same option shape.
    // `version --patch` and `version increment --patch` are one code path, not
    // two implementations that can drift.
    const versionProgram = program
    .command("version")
    .alias('v')
    .description("Comprehensive version and release management operations")
    .option("--init [version]", "Initialize the version line (bare = 0.0.0)")
    .option("-m, --major", "Increment the major version number")
    .option("-i, --minor", "Increment the minor version number")
    .option("-p, --patch", "Increment the patch version number")
    .option("-c, --channel <channel>", "Prerelease channel (e.g. alpha, beta)")
    .option("--prefix <prefix>", "Prefix for this version line (e.g. v, gear-v)")
    .option("--prerelease <identifier>", "Add a prerelease identifier")
    .option("--build <identifier>", "Add build metadata")
    .option("--no-channel-number", "Exclude the channel number")
    .option("--reset", "Delete every local tag for this line")
    .option("--list [count]", "List recent versions")
    .option("--latest", "Show the latest version")
    .option("--compare <version>", "Compare a version against the latest")
    .option("--revert <version>", "Revert to a specific version")
    .option("--validate <version>", "Check whether a version string is valid")
    .option("--detect", "Detect the current version from the project file")
    .option("--update [version]", "Update the version in the project file")
    .option("--path <path>", "Project file or folder path")
    .option("--sync", "Sync versions with the remote")
    .option("--push", "Push commits and tags to the remote")
    .option("--note <message>", "Add a release note")
    .option("--note-file <path>", "Load release notes from a file")
    .action(async (commandOptions: VersionCliArgs) => {
        // --path is the CLI spelling of the controller's projectPath, the same
        // translation `version project` performs.
        const options = { ...program.opts(), ...commandOptions, projectPath: (commandOptions as any).path } as VersionCliArgs;
        const controller = new VersionController()
        await controller.handleVersionCommand(options)
    });

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
        .action(async (args: string, commandOptions: VersionInitCliArgs, command: Command) => {
        // The positional is the version being initialised. The controller is a
        // FLAT flag dispatcher (options.init), so the subcommand layer has to
        // translate — parsing it and not forwarding it is why `version init
        // 1.0.0` silently produced 0.0.0.
        const options = { ...program.opts(), ...command.optsWithGlobals(), init: args } as VersionCliArgs;

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
        .action(async (commandOptions: VersionIncrementCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals() } as VersionCliArgs;

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
        .action(async (args: string, commandOptions: VersionSetCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals() } as VersionCliArgs;
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
        .action(async (commandOptions: VersionResetCliArgs, command: Command) => {
        // `reset` declares no options at all, so even with the signature fixed
        // nothing would set the flag the controller dispatches on — the command
        // would fall through to generateNewVersion and cut a version instead of
        // resetting. The subcommand states its own intent.
        const options = { ...program.opts(), ...command.optsWithGlobals(), reset: true } as VersionCliArgs;

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
        .action(async (args: string | undefined, commandOptions: VersionListCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals(), list: args ?? true } as VersionCliArgs;

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
        .action(async (commandOptions: VersionCompareCliArgs, command: Command) => {
            // The subcommand spells it --version; the controller dispatches on
            // options.compare. Without the translation the flag landed in
            // options.version, which the controller reads as "use this literal
            // version" — so `compare` would have CUT a tag instead of comparing.
            const options = { ...program.opts(), ...command.optsWithGlobals(), compare: (commandOptions as any).version } as VersionCliArgs;

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
        .action(async (commandOptions: VersionProjectCliArgs, command: Command) => {
            // --path is the subcommand's spelling of the controller's projectPath.
            const options = { ...program.opts(), ...command.optsWithGlobals(), projectPath: (commandOptions as any).path } as VersionCliArgs;

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
        .action(async (args: string, commandOptions: VersionValidateCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals(), validate: args } as VersionCliArgs;

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
        .action(async (args: string, commandOptions: VersionRevertCliArgs, command: Command) => {
        const options = { ...program.opts(), ...command.optsWithGlobals(), revert: args } as VersionCliArgs

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
        .action(async (commandOptions: VersionRemoteCliArgs, command: Command) => {
            const options = { ...program.opts(), ...command.optsWithGlobals() } as VersionCliArgs
    
            const controller = new VersionController()
            await controller.handleVersionCommand(options)
        })
    );


    return versionProgram;
}