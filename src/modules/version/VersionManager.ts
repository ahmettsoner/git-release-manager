import { VersionCliArgs } from "../../cli/types/VersionCliArgs";
import { GitVersionManager } from "./GitVersionManager";
import { ReleaseManager } from "./ReleaseManager";
import { VersionValidator } from "./VersionValidator";

export class VersionManager {
    private gitManager: GitVersionManager;
    private releaseManager: ReleaseManager;
    private validator: VersionValidator;

    constructor() {
        this.gitManager = new GitVersionManager();
        this.releaseManager = new ReleaseManager();
        this.validator = new VersionValidator();
    }

    async handleVersionCommand(options: VersionCliArgs): Promise<void> {
        try {

            if (options.list) {
                await this.gitManager.listVersions(options.list === true ? 10 : parseInt(options.list as string));
                return;
            }

            if (options.reset) {
                await this.gitManager.resetVersion();
                return;
            }

            if (options.latest) {
                await this.gitManager.showLatestVersion();
                return;
            }

            // Handle version creation/update
            const newVersion = await this.gitManager.generateNewVersion(options);
            await this.releaseManager.createVersion(newVersion, options);

        } catch (error) {
            throw new Error(error instanceof Error ? error.message : String(error));
        }


                try {
                    // Validate version manipulation options
                    this.validator.validateVersionOptions(options)
        
                    // Handle different version commands
                    if (options.list) {
                        await this.gitManager.listVersions(options.list === true ? 10 : parseInt(options.list as string))
                        return
                    }
        
                    if (options.reset) {
                        await this.gitManager.resetVersion()
                        return
                    }
        
                    if (options.latest) {
                        await this.gitManager.showLatestVersion()
                        return
                    }
        
                    if (options.compare) {
                        await this.gitManager.compareVersions(options.compare)
                        return
                    }
        
                    if (options.revert) {
                        await this.gitManager.revertToVersion(options.revert, options.push)
                        return
                    }
        
                    if (options.validate) {
                        this.validator.validateVersionFormat(options.validate)
                        return
                    }
        
                    if (options.sync) {
                        await this.gitManager.syncVersions(options.push)
                        return
                    }
        
                    // Handle version creation/update
                    const newVersion = await this.gitManager.generateNewVersion(options)
                    await this.releaseManager.createVersion(newVersion, options)
                } catch (error) {
                    console.error('Error:', error instanceof Error ? error.message : String(error))
                    process.exit(1)
                }
    }
}