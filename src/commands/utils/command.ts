import { Argument, Command, Option } from 'commander'
import { FlowManager } from "../../modules/FlowManager";

export function createFlowCommand(program: Command) :Command {

    const utilsProgram = program
    .command("utils")
    .alias('u')
    .description("Tools to manage your git releases and versioning");

    const programFile = utilsProgram.command('file').description('')

    programFile.addCommand(
        new Command()
            .command('change-name <path> <newName>')
            .description('Changes the file name and returns the new path')
            .action(async (path: string, newName: string) => {
                const pathSegments = path.split('/');
                pathSegments[pathSegments.length - 1] = newName;
                const newPath = pathSegments.join('/');
                console.log(`New file path: ${newPath}`);
                // No return statement is needed here
            })
    );
    
    
    

    return utilsProgram;
}