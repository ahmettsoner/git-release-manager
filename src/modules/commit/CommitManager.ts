import { LogResult, Options, simpleGit, SimpleGit } from 'simple-git'
import { CommitCliArgs } from '../../cli/types/CommitCliArgs'
import { Config } from '../../config/types/Config'

export class CommitManager {
    private readonly git: SimpleGit

    constructor() {
        this.git = simpleGit()
    }

    async createCommit(options: CommitCliArgs, config: Config): Promise<void> {
        try {
            // Stage files
            if (options.all) {
                await this.git.add('.')
            } else if (options.file) {
                await this.git.add(options.file)
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

            const commitOptions: Options = {};
            if (options.noVerify) commitOptions['--no-verify'] = null;
            if (options.sign) commitOptions['--sign'] = null;
            if (options.amend) commitOptions['--amend'] = null;
            

            // Execute commit
            await this.git.commit(commitMessage.join(''), options.file || [], commitOptions);

            // // Optionally push changes
            // if (options.push) {
            //     await this.git.push(config.remote || 'origin', config.branch || 'main')
            // }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }

    async listCommits(options: CommitCliArgs, config: Config): Promise<void> {
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