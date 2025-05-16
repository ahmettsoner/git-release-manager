import { ChangelogGenerateCliArgs } from '../../commands/changelog/types/ChangelogGenerateCliArgs';
import { Config } from '../../config/types/Config';
import { writeOutput } from '../output/writer';
import { ChangelogValidator } from './ChangelogValidator';
import { renderChangelogTemplate } from './templateOperations';

export class ChangelogController {
    private readonly validator :ChangelogValidator

    constructor() {
        this.validator = new ChangelogValidator();
    }

    async handleGenerateCommand(options: ChangelogGenerateCliArgs, config: Config): Promise<void> {
        this.validator.validateOptions(options)

        try {
            let templatePath = options.template || config.template
            let outputOpt = options.output || config.output
            const fileData = await renderChangelogTemplate(templatePath, options, config)

            if (fileData) {
                writeOutput(fileData, outputOpt)
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }
}