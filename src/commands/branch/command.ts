import { Option, Argument, Command } from 'commander'
import { BranchController } from '../../modules/branch/BranchController'
import { BranchCreateCliArgs } from './types/BranchCreateCliArgs'
import { BranchDeleteCliArgs } from './types/BranchDeleteCliArgs'
import { BranchMergeCliArgs } from './types/BranchMergeCliArgs'
import { BranchSwitchCliArgs } from './types/BranchSwitchCliArgs'
import { BranchProtectCliArgs } from './types/BranchProtectCliArgs'
import { BranchUnProtectCliArgs } from './types/BranchUnProtectCliArgs'
import { BranchRebaseCliArgs } from './types/BranchRebaseCliArgs'
import { BranchListCliArgs } from './types/BranchListCliArgs'

const branchTypes = [
    { name: 'release', prefix: 'release/' },
    { name: 'hotfix', prefix: 'hotfix/' },
    { name: 'feature', prefix: 'feature/' },
]

export async function createBranchCommand(program: Command): Promise<Command> {
    const createBranchSubcommand = (type: string, prefix: string) => {
        return new Command(type)
            .description(`Create and manage ${type} branches`)
            .argument('<name>', `Name of the ${type} branch`)
            .addOption(new Option('--based-on <branch>', 'Base branch'))
            .addOption(new Option('--no-switch', 'Don\'t switch to new branch'))
            .action(async (args: string, commandOptions: BranchCreateCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                const branchName = args

                options.name = `${prefix}${branchName}`
                console.log(`Creating ${type} branch: ${options.name}`)

                const controller = new BranchController()
                await controller.handleCreateCommand(options)
            })
    }
    const deleteBranchSubcommand = (type: string, prefix: string) => {
        return new Command(type)
            .description(`Delete a ${type} branch`)
            .argument('<name>', `Name of the ${type} branch to delete`)
            .action(async (args: string, commandOptions: BranchDeleteCliArgs) => {
                const options = { ...program.opts(), ...commandOptions };
                const branchName = `${prefix}${args}`;
                options.name = branchName;

                console.log(`Deleting ${type} branch: ${branchName}`);

                const controller = new BranchController();
                await controller.handleDeleteCommand(options);
            });
    };

    const mergeBranchSubcommand = (type: string, prefix: string) => {
        return new Command(type)
            .description(`Merge a ${type} branch into the current branch`)
            .argument('<name>', `Name of the ${type} branch to merge`)
            .addOption(new Option('--squash', 'Squash commits into a single commit'))
            .action(async (args: string, commandOptions: BranchMergeCliArgs) => {
                const options = { ...program.opts(), ...commandOptions };
                const branchName = `${prefix}${args}`;
                options.name = branchName;

                console.log(`Merging ${type} branch: ${branchName} into the current branch.`);

                const controller = new BranchController();
                await controller.handleMergeCommand(options);
            });
    };
    const switchBranchSubcommand = (type: string, prefix: string) => {
        return new Command(type)
            .description(`Switch to a ${type} branch`)
            .argument('<name>', `Name of the ${type} branch to switch to`)
            .action(async (args: string, commandOptions: BranchSwitchCliArgs) => {
                const options = { ...program.opts(), ...commandOptions };
                const branchName = `${prefix}${args}`;
                options.name = branchName;

                console.log(`Switching to ${type} branch: ${branchName}`);

                const controller = new BranchController();
                await controller.handleSwitchCommand(options);
            });
    };

    const programBranch = program.command('branch').alias('b').description('Manage different types of git branches')
    const programBranchCreate = new Command()
        .command('create')
        .alias('c')
        .description('Create a new branch')
        .addArgument(new Argument('<name>', 'branch to create'))
        .addOption(new Option('--base-branch <branch>', 'Base branch'))
        .addOption(new Option('--no-switch', 'Don\'t switch to new branch'))
        .action(async (args: string, commandOptions: BranchCreateCliArgs) => {
            const options = { ...program.opts(), ...commandOptions }
            options.name = args

            console.log(`Creating branch: ${options.name}`)

            const controller = new BranchController()
            await controller.handleCreateCommand(options)
        })

    branchTypes.forEach(({ name, prefix }) => {
        programBranchCreate.addCommand(createBranchSubcommand(name, prefix))
    })
    programBranch.addCommand(programBranchCreate)

    const programBranchDelete =  new Command()
    .command('delete')
    .alias('d')
    .description('Delete a given branch')
    .argument('<name>', 'Name of the branch to delete')
    .action(async (args: string, commandOptions: BranchDeleteCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        options.name = args

        const controller = new BranchController()
        await controller.handleDeleteCommand(options)
    })
    

    branchTypes.forEach(({ name, prefix }) => {
        programBranchDelete.addCommand(deleteBranchSubcommand(name, prefix));
    });
    programBranch.addCommand(programBranchDelete)

    const programBranchMerge =         new Command()
    .command('merge')
    .alias('m')
    .description('Merge a branch into the current branch')
    .argument('<name>', 'Name of the branch to be merged')
    .addOption(new Option('--squash', 'Squash commits into a single commit'))
    .action(async (args: string, commandOptions: BranchMergeCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        options.name = args

        const controller = new BranchController()
        await controller.handleMergeCommand(options)
    });

    branchTypes.forEach(({ name, prefix }) => {
        programBranchMerge.addCommand(mergeBranchSubcommand(name, prefix));
    });
    programBranch.addCommand(programBranchMerge)
    
    
    programBranch.addCommand(
        new Command()
            .command('rebase')
            .alias('r')
            .description('Rebase the current branch onto another specified branch')
            .argument('<name>', 'Name of the branch to rebase onto')
            .action(async (args: string, commandOptions: BranchRebaseCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                options.name = args

                const controller = new BranchController()
                await controller.handleRebaseCommand(options)
            })
    )

    const programBranchSwitch = new Command()
    .command('switch')
    .alias('s')
    .description('Switch to branch')
    .addArgument(new Argument('<name>', 'branch to switch'))
    .action(async (args: string, commandOptions: BranchSwitchCliArgs) => {
        const options = { ...program.opts(), ...commandOptions }
        options.name = args

        const controller = new BranchController()
        await controller.handleSwitchCommand(options)
    })
    
    branchTypes.forEach(({ name, prefix }) => {
        programBranchSwitch.addCommand(switchBranchSubcommand(name, prefix));
    });
    
    programBranch.addCommand(programBranchSwitch)

    programBranch.addCommand(
        new Command()
            .command('protect')
            .alias('p')
            .description('Protect the specified branch from direct commits, defaults to the current branch if no name is provided')
            .argument('[name]', 'Optional: Name of the branch to protect. If omitted, the current branch is protected')
            .action(async (args: string, commandOptions: BranchProtectCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                options.name = args
                const controller = new BranchController()
                await controller.handleProtectCommand(options)
            })
    )
    programBranch.addCommand(
        new Command()
            .command('unprotect')
            .description('Remove protection from the specified branch; defaults to the current branch if no name is provided')
            .argument('[name]', 'Optional: Name of the branch to unprotect. If omitted, the current branch is unprotected')
            .action(async (args: string, commandOptions: BranchUnProtectCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }
                options.name = args
                const controller = new BranchController()
                await controller.handleUnProtectCommand(options)
            })
    )

    programBranch.addCommand(
        new Command()
            .command('list')
            .alias('l')
            .description('List all branches with filtering options')
            .addOption(new Option('--remote [origin]', 'List branches from remote'))
            .action(async (args: string, commandOptions: BranchListCliArgs) => {
                const options = { ...program.opts(), ...commandOptions }

                const controller = new BranchController()
                await controller.handleListCommand(options)
            })
    )

    // const options = program.opts() as CliArgs
    // const config = await readConfig(options.config, options.environment);

    // Object.entries(config.branchStrategies as Record<string, BranchConfig>).forEach(([type, config]: [string, BranchConfig]) => {
    //     program.addCommand(createBranchSubcommand(type, `${type}/`))
    // })

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

    return programBranch
}
