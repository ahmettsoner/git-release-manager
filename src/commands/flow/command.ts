import { Argument, Command, Option } from 'commander'
import { FlowManager } from "../../modules/FlowManager";

// Every phase command is a QUESTION about a version, and the question is
// carried entirely by the selector flags. With none of them set nothing was
// selected, and the phase still printed — a lone prefix, `v`, with exit 0.
// That string is not a version under any reading, and a caller substituting it
// into a tag name gets a plausible-looking wrong answer instead of a failure.
//
// The refusal names the selectors THIS phase accepts rather than a fixed list:
// prod carries --next-fix and --previous, dev carries neither, and a message
// offering an option the command would reject is worse than no message.
//
// Deliberately not a default. Choosing one (bare == --next) would settle a
// contract nobody has stated — `--current` is an explicit opt-in with
// `default: false`, so the author's own design treats selection as something
// the caller says out loud. A default can be added later without breaking a
// caller; silently changing what `flow phase dev` answers cannot.
const PHASE_SELECTORS = ['next', 'nextRelease', 'nextFix', 'current', 'previous', 'previousFix'] as const

function requirePhaseSelector(command: Command, options: Record<string, unknown>): void {
    const accepted = PHASE_SELECTORS.filter(selector =>
        command.options.some(option => option.attributeName() === selector)
    )

    if (accepted.some(selector => Boolean(options[selector]))) {
        return
    }

    const spelled = accepted.map(selector => '--' + selector.replace(/[A-Z]/g, c => '-' + c.toLowerCase()))
    console.error(`error: ${command.name()} needs to know WHAT to determine — pass one of: ${spelled.join(', ')}`)
    process.exit(1)
}

export function createFlowCommand(program: Command) :Command {

    const flowProgram = program
    .command("flow")
    .alias('f')
    .description("Tools to manage your git releases and versioning");

    const programPhase = flowProgram.command('phase').description('')

    programPhase.addCommand(
        new Command()
            .command('dev')
            .alias('d')
            .description('Determine version')
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .addOption(new Option('-n, --next', 'Next version'))
            .addOption(new Option('-c, --current', 'Current version').default(false))
            .action(async (commandOptions: any, command: Command) => {
                const options = { ...program.opts(), ...commandOptions }
                requirePhaseSelector(command, options)

                const flowManager = new FlowManager()
                const determinedVersion = await flowManager.DetermineDevPhaseVersion('dev', options)
                if (determinedVersion) {
                    console.log(determinedVersion.replace('\n', ''))
                }
            })
    )
    
    programPhase.addCommand(
        new Command()
            .command('qa')
            .alias('t')
            .description('Determine version')
            .addArgument(new Argument('<channel>', 'Specify the channel'))
            .addArgument(new Argument('[version]', 'Specify the version'))
            .addOption(new Option('-n, --next', 'Next version'))
            .addOption(new Option('--next-release', 'Next release version'))
            .addOption(new Option('-c, --current', 'Current version').default(false))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .action(async (channel: string, version: string, commandOptions: any, command: Command) => {
                const options = { ...program.opts(), ...commandOptions }
                requirePhaseSelector(command, options)

                const flowManager = new FlowManager()
                const determinedVersion = await flowManager.DetermineQAPhaseVersion(channel, version, options)
                if (determinedVersion) {
                    console.log(determinedVersion.replace('\n', ''))
                }
            })
    )
    
    programPhase.addCommand(
        new Command()
            .command('stage')
            .alias('s')
            .description('Determine version')
            .addArgument(new Argument('<channel>', 'Specify the channel'))
            .addArgument(new Argument('[version]', 'Specify the version'))
            .addOption(new Option('-n, --next', 'Next version'))
            .addOption(new Option('--next-release', 'Next release version'))
            .addOption(new Option('-c, --current', 'Current version').default(false))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .action(async (channel: string, version: string, commandOptions: any, command: Command) => {
                const options = { ...program.opts(), ...commandOptions }
                requirePhaseSelector(command, options)

                const flowManager = new FlowManager()
                const determinedVersion = await flowManager.DetermineStagePhaseVersion(channel, version, options)
                if (determinedVersion) {
                    console.log(determinedVersion.replace('\n', ''))
                }
            })
    )
    
    programPhase.addCommand(
        new Command()
            .command('prod')
            .alias('p')
            .description('Determine version')
            .addArgument(new Argument('[version]', 'Specify the version'))
            .addOption(new Option('-n, --next', 'Next version'))
            .addOption(new Option('--next-release', 'Next release version'))
            .addOption(new Option('--next-fix', 'Next fix release version'))
            .addOption(new Option('-c, --current', 'Current version').default(false))
            .addOption(new Option('--previous', 'Previous version'))
            .addOption(new Option('--previous-fix', 'Previous fix release version'))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel']).default(''))
            .action(async (version: string, commandOptions: any, command: Command) => {
                const options = { ...program.opts(), ...commandOptions }
                requirePhaseSelector(command, options)

                const flowManager = new FlowManager()
                const determinedVersion = await flowManager.DetermineProductionPhaseVersion("beta", version, options)
                if (determinedVersion) {
                    console.log(determinedVersion.replace('\n', ''))
                }
            })
    )
    
    
    
    const programTag = flowProgram.command('tag').description('')
    
    programTag.addCommand(
        new Command()
            .command('list')
            .alias('l')
            .description('List release branches')
            .addArgument(new Argument('branch'))
            // Symmetric with `tag latest` on purpose: a pair where one verb can
            // ask about a channel and its sibling cannot is its own defect.
            .addOption(new Option('-c, --channel <channel>', 'Restrict to a prerelease channel (e.g. dev, alpha); omitted means stable tags only'))
            .action(async (branch: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }

                const flowManager = new FlowManager()
                // Query verb: report every tag on the branch, prereleases included —
                // narrowed to the channel when one was named.
                const existingTags = await flowManager.listBranchTags(branch, options.channel ?? null, true)
                console.log(existingTags)
            })
    )
    
    programTag.addCommand(
        new Command()
            .command('latest')
            .description('Get latest branch tag')
            .addArgument(new Argument('<branch>', 'Specify the branch'))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .addOption(new Option('-c, --channel <channel>', 'Restrict to a prerelease channel (e.g. dev, alpha); omitted means stable tags only'))
            .action(async (branch: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
                const flowManager = new FlowManager()
                // Query verb: a dev/alpha/beta branch's newest tag IS a
                // prerelease, so excluding them would make this always empty.
                const latestBranchTag = await flowManager.latestTagVersion(branch, options.channel ?? null, null, true)
                const latestBranchVersion = flowManager.getVersionPart(latestBranchTag, options)
                console.log(latestBranchVersion)
            })
    )
    
    const programRelease = flowProgram.command('release').description('')
    
    programRelease.addCommand(
        new Command()
            .command('list')
            .alias('l')
            .description('List release branches')
            .addArgument(new Argument('channel'))
            .action(async (channel: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
                const flowManager = new FlowManager()
                const existingReleaseBranches = await flowManager.listReleaseBranches(channel)
                console.log(existingReleaseBranches)
            })
    )
    
    programRelease.addCommand(
        new Command()
            .command('latest')
            .description('Get latest release branch')
            .addArgument(new Argument('<channel>', 'Specify the channel'))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .action(async (channel: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
                const flowManager = new FlowManager()
                let latestBranch = await flowManager.latestReleaseBranchVersion(channel)
                latestBranch = flowManager.getVersionPart(latestBranch, options)
                console.log(latestBranch)
            })
    )
    
    program.action(() => {
        console.log('Please specify a command or use --help for usage information')
        process.exit(1)
    })
    
    

    return flowProgram;
}