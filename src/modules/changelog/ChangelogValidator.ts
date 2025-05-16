import semver from 'semver'
import { VersionCliArgs } from '../../commands/version/types/VersionCliArgs'

export class ChangelogValidator {
    public validateOptions(options: VersionCliArgs): void {
        const versionIncrementOptions = [options.major, options.minor, options.patch].filter(Boolean).length
    
        if (versionIncrementOptions > 1) {
            throw new Error('Cannot specify multiple version increment options')
        }
    
        if (options.init && (options.major || options.minor || options.patch)) {
            throw new Error('Cannot combine --init with version increment options')
        }
    
        if (options.revert && (options.major || options.minor || options.patch)) {
            throw new Error('Cannot combine --revert with version increment options')
        }
    }
}