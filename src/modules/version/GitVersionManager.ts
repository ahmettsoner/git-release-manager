import simpleGit from "simple-git"
import semver from 'semver'
import { incrementVersion } from "./versionFormatter"
import { VersionCliArgs } from "../../commands/version/types/VersionCliArgs"


const git = simpleGit()
export class GitVersionManager {

    async getLatestTag (prefix?: string, channel?: string): Promise<string> {
        let defaultTag = '0.0.0'
        if (prefix) {
            defaultTag = `${prefix}${defaultTag}`
        }
    
        try {
            const tags = await git.tags()
            let filteredTags = tags.all
    
            if (prefix) {
                filteredTags = filteredTags.filter(tag => tag.startsWith(prefix))
            }
    
            if (channel) {
                const channelTags = filteredTags.filter(tag => tag.includes(`-${channel}`))
                filteredTags = channelTags.length > 0 ? channelTags : filteredTags
            }
    
            const latestTag =
                filteredTags
                    .map(tag => (prefix ? tag.replace(prefix, '') : tag))
                    .filter(tag => semver.valid(tag))
                    .sort(semver.rcompare)[0] || defaultTag
        
            return prefix && !latestTag.startsWith(prefix) ? `${prefix}${latestTag}` : latestTag
        } catch (error) {
            console.error('Could not retrieve tags:', error)
            return defaultTag
        }
    }

    async listVersions(count: number = 10): Promise<void> {
        const tags = await git.tags()
        const versions = tags.all
            .filter(tag => semver.valid(tag))
            .sort((a, b) => semver.rcompare(a, b))
            .slice(0, count)
    
        console.log('\nVersion History:')
        console.log('================')
    
        for (const version of versions) {
            const tagDetails = await git.show(['--quiet', version])
            console.log(`\nVersion: ${version}`)
            console.log(`Date: ${tagDetails.split('\n')[2]}`)
            console.log('-----------------')
        }
    }

    async showLatestVersion(): Promise<void> {
        const version = await this.getLatestTag()
        console.log(`Latest version: ${version}`)
    }



    async compareVersions(compareVersion: string): Promise<void> {
        // Fetch the latest version tag from the repository
        const latestVersion = await this.getLatestTag()

        // Use semver to compare the two versions
        const comparison = semver.compare(latestVersion, compareVersion)

        // Determine the relationship between the two versions
        let comparisonText = ''
        if (comparison > 0) {
            // latestVersion is greater than compareVersion
            comparisonText = `${compareVersion} is behind ${latestVersion}`
        } else if (comparison < 0) {
            // compareVersion is greater than latestVersion
            comparisonText = `${compareVersion} is ahead of ${latestVersion}`
        } else {
            // Both versions are equal
            comparisonText = `${compareVersion} is the same as ${latestVersion}`
        }

        // Print the comparison result
        console.log(`Comparing ${compareVersion} with ${latestVersion}`)
        console.log(comparisonText)

        // Print the changes between the compared versions
        console.log('\nChanges:')
        const diff = await git.diff([`${compareVersion}...${latestVersion}`])
        console.log(diff)
    }


    async  revertToVersion(version: string, push?: boolean): Promise<void> {
        if (!semver.valid(version)) {
            throw new Error(`Invalid version format: ${version}`)
        }
    
        await git.reset(['--hard', version])
        console.log(`Reverted to version ${version}`)
    
        if (push) {
            await git.push('origin', 'HEAD', ['--force'])
            console.log('Force pushed revert to remote')
        }
    }


async  syncVersions(push?: boolean): Promise<void> {
    await git.fetch(['--tags', '--force'])
    console.log('Synced tags with remote')

    if (push) {
        const localTags = await git.tags()
        await git.pushTags('origin')
        console.log('Pushed local tags to remote')
    }
}



async createGitTag (version: string, message?: string): Promise<void> {
    // ANNOTATED, not lightweight. simple-git's addTag() creates a lightweight
    // tag: a bare ref with no tagger, no date and no message, so a release
    // identified by one carries no record of who cut it or when. Consumers
    // reject them for exactly that reason — `git describe --exact-match`
    // ignores lightweight tags by default, so a downstream derivation looking
    // for "the version at this commit" simply does not see it.
    //
    // The failure is also no longer swallowed. It used to console.error and
    // return, so a run that created NOTHING still printed "Version X created
    // successfully" and exited 0 — the caller had no way to tell a real release
    // from a no-op.
    await git.raw(['tag', '-a', version, '-m', message ?? version])
}
    async initVersion(options: VersionCliArgs): Promise<string> {
        const prefix = options.prefix ?? ''
        const initialVersion = `${prefix}${typeof options.init === 'string' ? options.init : '0.0.0'}`
        
        const tags = await git.tags()
        if (tags.all.length > 0) {
            throw new Error('Repository already has tags. Use --reset if needed.')
        }
        
        return initialVersion
    }

    async  generateNewVersion(options: VersionCliArgs): Promise<string> {
        let newVersion: string
    
            // --from lets a CALLER supply the baseline instead of having it
            // discovered here. Discovery is a policy question this engine
            // cannot answer for everyone: getLatestTag takes the highest tag
            // matching prefix/channel, but a consumer may require that the tag
            // be ANNOTATED, or reachable from a particular branch, or both.
            // Without an injection point such a consumer has to reimplement the
            // arithmetic to keep its own baseline — which is how two semver
            // implementations end up in one release path, disagreeing exactly
            // where it is hardest to see.
            const latestTag = options.from ? options.from : await this.getLatestTag(options.prefix, options.channel)

            const type = options.major ? 'major' : options.minor ? 'minor' : options.patch ? 'patch' : undefined
            newVersion = await incrementVersion(latestTag, type, {
                channel: options.channel,
                channelNumber: options.channelNumber,
                prefix: options.prefix,
                prerelease: options.prerelease,
                build: options.build,
            })
    
        return newVersion
    }

    async resetVersion (channel?: string, prefix?: string) {
        try {
            const { all: tags } = await git.tags()
            if (tags.length === 0) {
                console.log('No local tags found.')
                return
            }
    
            await git.raw(['tag', '-d', ...tags])
            console.log('All local tags deleted:', tags)
        } catch (error) {
            console.error('Error deleting tags:', error)
        }
    }
    

async  pushChanges(version: string, hasBranch?: boolean): Promise<void> {
    if (hasBranch) {
        const branchName = `release/v${version}`
        await git.push('origin', branchName)
    }
    await git.pushTags()
}

}