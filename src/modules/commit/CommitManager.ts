import { LogResult, Options, simpleGit, SimpleGit } from 'simple-git'
import { Config } from '../../config/types/Config'
import { CommitListCliArgs } from '../../cli/types/CommitListCliArgs'
import { CommitCreateCliArgs } from '../../cli/types/CommitCreateCliArgs'

export class CommitManager {
    private readonly git: SimpleGit

    constructor() {
        this.git = simpleGit()
    }

    async stageAll(){
        await this.git.add('.')
    }
    async stageFiles(files:string[]){
        await this.git.add(files)
    }
    async createCommit(options: CommitCreateCliArgs, config: Config): Promise<void> {
        try {
            const commitOptions: Options = {};
            if (options.add == "all") {
                await this.stageAll()
            } else if (options.add == 'empty') {
                commitOptions['--allow-empty'] = null;
            } else {
                await this.stageFiles(options.add as string[])
            }


            // Prepare commit message parts
            const commitMessage = []
            if (options.type && options.scope) {
                commitMessage.push(`${options.type}(${options.scope}): ${options.message}`)
            } else if (options.type) {
                commitMessage.push(`${options.type}: ${options.message}`)
            } else {
                commitMessage.push(options.message ?? 'No commit message provided')
            }

            if (options.body) {
                commitMessage.push(`\n\n${options.body.join('\n')}`)
            }
            
            if (options.breaking) {
                commitMessage.push(`\n\nBREAKING CHANGE: ${options.breaking}`)
            }

            // Convert commit options to an array format:

            if (options.noVerify) commitOptions['--no-verify'] = null;
            if (options.sign) commitOptions['--sign'] = null;
            // if (options.amend) commitOptions['--amend'] = null;
            

            // Execute commit
            await this.git.commit(commitMessage.join(''), commitOptions);

            // // Optionally push changes
            // if (options.push) {
            //     await this.git.push(config.remote || 'origin', config.branch || 'main')
            // }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }

    async listCommits(options: CommitListCliArgs, config: Config): Promise<void> {
        try {
            const count = typeof options.count === 'number' ? options.count : 1;
            const log: LogResult = await this.git.log({ maxCount: count });
            log.all.forEach(commit => {
                console.log(`Commit: ${commit.hash}`);
                console.log(`Author: ${commit.author_name} <${commit.author_email}>`);
                console.log(`Date: ${commit.date}`);
                console.log(`Message: ${commit.message}`);
                console.log('---');
            });
        } catch (error) {
            console.error('Error listing commits:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
}