import { VersionCliArgs } from '../../cli/types/VersionCliArgs'
import { GitVersionManager } from './GitVersionManager'
import { ProjectVersionManager } from './ProjectVersion'
import { ReleaseManager } from './ReleaseManager'
import { VersionValidator } from './VersionValidator'

export class VersionManager {
    private gitManager: GitVersionManager
    private releaseManager: ReleaseManager
    private validator: VersionValidator
    private projectVersionManager: ProjectVersionManager

    constructor() {
        this.gitManager = new GitVersionManager()
        this.releaseManager = new ReleaseManager()
        this.validator = new VersionValidator()
        this.projectVersionManager = new ProjectVersionManager()
    }

    async handleVersionCommand(options: VersionCliArgs): Promise<void> {
        try {
            // Validate version manipulation options
            this.validator.validateVersionOptions(options)

            if (options.reset) {
                await this.gitManager.resetVersion()
                return
            }

            if (options.detect) {
                const projectVersion = this.projectVersionManager.detectProjectVersion(options.projectPath)
                console.log(`Using project file: ${projectVersion.filePath}\nCurrent version: ${projectVersion.currentVersion}`)

                // Eğer version manipulation flag'leri varsa, versiyon güncelleme işlemlerini yap
                if (options.major || options.minor || options.patch) {
                    // TODO: Implement version update logic
                    // await this.updateVersionInFile(projectFile, newVersion)
                }

                return
            }
        
            
            if (options.update) {
                // Versiyon güncelleme
                const projectVersion = typeof options.update === 'string' ? options.update : undefined;

                await this.projectVersionManager.updateProjectVersion(projectVersion, options.projectPath)
                return
            }

            // Handle different version commands
            if (options.list) {
                await this.gitManager.listVersions(options.list === true ? 10 : parseInt(options.list as string))
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
            let newVersion = ""
            if(options.init) {
                newVersion = await this.gitManager.initVersion(options)
            }else{
                newVersion = await this.gitManager.generateNewVersion(options)
            }
            await this.releaseManager.createVersion(newVersion, options)


        
            // Create git tag
            if (options.tag !== false) {
                // Default to true if not explicitly set to false
                await this.gitManager.createGitTag(newVersion)
                console.log(`Created tag: ${newVersion}`)
            }


            // Push changes if requested
            if (options.push) {
                await this.gitManager.pushChanges(newVersion, options.branch)
                console.log('Pushed changes to remote')
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }
}
