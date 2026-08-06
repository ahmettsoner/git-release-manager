import { Argument, Command, Option } from 'commander'
import { FlowManager } from "../../modules/FlowManager";
import { FlowController } from "../../modules/flow/FlowController";
import { readConfig } from "../../config/configManager";

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

/**
 * The DECLARED flow (config `flow.phases`) and the git-flow phase surface below
 * are two answers to one question, so a project that has declared the first must
 * not silently get the second.
 *
 * `flow phase *` runs on FlowManager, which carries its own hardcoded phases and
 * receives no project config — measured against a repository at v1.3.0, it
 * answered `v1.0.0-dev.1`. That is not a surface to leave reachable beside a
 * declaration it cannot see: the two would disagree, and the wrong one looks
 * exactly as authoritative as the right one.
 */
async function refuseWhenFlowIsDeclared(options: any, verb: string): Promise<void> {
    let config
    try {
        config = await readConfig(options.config, options.environment)
    } catch {
        return   // no config to contradict
    }
    const phases = config?.flow?.phases
    if (phases && Object.keys(phases).length > 0) {
        console.error(
            `error: this project declares flow.phases (${Object.keys(phases).join(", ")}), ` +
            `which \`flow ${verb}\` cannot read.\n` +
            `  Use:  grm flow next <phase>   ·   grm flow run <phase> [--yes]`
        )
        process.exit(1)
    }
}

async function loadFlow(options: any): Promise<FlowController> {
    const config = await readConfig(options.config, options.environment)
    if (!config) throw new Error("no config could be read")
    return new FlowController(config, process.cwd())
}

export function createFlowCommand(program: Command) :Command {

    const flowProgram = program
    .command("flow")
    .alias('f')
    .description("Tools to manage your git releases and versioning");

    // ── the DECLARED flow ────────────────────────────────────────────────────
    // `next` is the question, `run` is the act, and `run` PLANS unless told to
    // proceed. A promotion moves branches and creates a tag; a verb that does
    // that on the way to answering "what would it be" cannot be consulted by
    // anything upstream.
    flowProgram.addCommand(
        new Command()
            .command('next')
            .description('The version this phase would cut, derived from the commit range')
            .addArgument(new Argument('<phase>', 'A phase declared in flow.phases'))
            .addOption(new Option('--explain', 'Print the derivation`s reasoning on STDERR'))
            .action(async (phase: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
                try {
                    const flow = await loadFlow(options)
                    const p = flow.phase(phase)
                    const { version, current, why } = await flow.nextVersion(p)
                    if (options.explain) {
                        console.error(`phase ${phase}: branch ${p.branch}, current ${current}`)
                        if (why) console.error(`bump: ${why}`)
                    }
                    console.log(version)          // stdout is the version ALONE
                } catch (e) {
                    console.error(`error: ${e instanceof Error ? e.message : String(e)}`)
                    process.exit(1)
                }
            })
    )

    flowProgram.addCommand(
        new Command()
            .command('run')
            .description('Promote and tag a declared phase (plans unless --yes)')
            .addArgument(new Argument('<phase>', 'A phase declared in flow.phases'))
            .addOption(new Option('-y, --yes', 'Execute; without it nothing is written'))
            .action(async (phase: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
                try {
                    const flow = await loadFlow(options)
                    if (!options.yes) {
                        const plan = await flow.plan(phase)
                        console.error(`phase        : ${plan.phase}`)
                        console.error(`branch       : ${plan.branch}${plan.channel ? ` (channel ${plan.channel})` : ''}`)
                        if (plan.mergeFrom) {
                            console.error(`promote      : ${plan.mergeFrom} -> ${plan.branch} (${plan.mergeStrategy})`)
                            console.error(`to land      : ${plan.ahead} commit(s)` +
                                (plan.behind ? ` — and ${plan.behind} on ${plan.branch} that ${plan.mergeFrom} does NOT have` : ''))
                        }
                        console.error(`version      : ${plan.current} -> ${plan.next}`)
                        if (plan.bumpWhy) console.error(`bump         : ${plan.bumpWhy}`)
                        console.error(`tag          : ${plan.willTag ? 'yes' : 'no'}`)
                        console.error(`delete source: ${plan.willDeleteSource ? 'YES' : 'no'}`)
                        if (plan.worktree) console.error(`worktree     : ${plan.worktree}`)
                        console.error(`PLAN ONLY — nothing was merged, tagged or deleted. Execute: grm flow run ${phase} --yes`)
                        console.log(plan.next)
                        return
                    }
                    const done = await flow.run(phase)
                    if (done.mergeCommit) console.error(`merged ${done.mergeFrom} -> ${done.branch} (${done.mergeCommit.slice(0, 10)})`)
                    if (done.tagged) console.error(`tagged ${done.tagged}`)
                    console.log(done.next)
                } catch (e) {
                    console.error(`error: ${e instanceof Error ? e.message : String(e)}`)
                    process.exit(1)
                }
            })
    )

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
                await refuseWhenFlowIsDeclared(options, 'phase')
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
                await refuseWhenFlowIsDeclared(options, 'phase')
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
                await refuseWhenFlowIsDeclared(options, 'phase')
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
                await refuseWhenFlowIsDeclared(options, 'phase')
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