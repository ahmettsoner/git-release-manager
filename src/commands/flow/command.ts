import { Argument, Command, Option } from 'commander'
import { FlowManager } from "../../modules/FlowManager";

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
            .action(async (commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
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
            .action(async (channel: string, version: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
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
            .action(async (channel: string, version: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
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
            .action(async (version: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
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
            .action(async (branch: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
    
                const flowManager = new FlowManager()
                const existingTags = await flowManager.listBranchTags(branch)
                console.log(existingTags)
            })
    )
    
    programTag.addCommand(
        new Command()
            .command('latest')
            .description('Get latest branch tag')
            .addArgument(new Argument('<branch>', 'Specify the branch'))
            .addOption(new Option('-p, --print <type>', 'Print option can be full, base, channel, or left empty').choices(['full', 'base', 'channel', 'build']).default(''))
            .action(async (branch: string, commandOptions: any) => {
                const options = { ...program.opts(), ...commandOptions }
                const flowManager = new FlowManager()
                const latestBranchTag = await flowManager.latestTagVersion(branch)
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