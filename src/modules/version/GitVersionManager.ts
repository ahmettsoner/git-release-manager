import simpleGit from "simple-git"
import semver from 'semver'
import { VersionCliArgs } from "../../cli/types/VersionCliArgs"
import { incrementChannelOnly, incrementVersion } from "./versionFormatter"


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
    
            return prefix ? `${prefix}${latestTag}` : latestTag
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
        const latestVersion = await this.getLatestTag()
        const comparison = semver.compare(latestVersion, compareVersion)
        const diff = await git.diff([`${compareVersion}...${latestVersion}`])
    
        console.log(`Comparing ${compareVersion} with ${latestVersion}`)
        console.log(`${compareVersion} is ${comparison === 1 ? 'ahead' : 'behind'} ${latestVersion}`)
        console.log('\nChanges:')
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



async createGitTag (version: string): Promise<void> {
    try {
        await git.addTag(version)
        // await git.pushTags()
    } catch (error) {
        console.error('Could not create git tag:', error)
    }
}

    async  generateNewVersion(options: VersionCliArgs): Promise<string> {
        let newVersion: string
    
        if (options.init) {
            const tags = await git.tags()
            if (tags.all.length > 0) {
                throw new Error('Repository already has tags. Use --reset if needed.')
            }
            
            newVersion = typeof options.init === 'string' ? options.init : '0.0.0'
        } else {
            const latestTag = await this.getLatestTag(options.prefix, options.channel)
    
            if (options.major || options.minor || options.patch) {
                const type = options.major ? 'major' : options.minor ? 'minor' : 'patch'
                newVersion = await incrementVersion(latestTag, type, {
                    channel: options.channel,
                    channelNumber: options.channelNumber,
                    prefix: options.prefix,
                    prerelease: options.prerelease,
                    build: options.build,
                })
            } else if (options.channel) {
                newVersion = await incrementChannelOnly(latestTag, {
                    channel: options.channel,
                    channelNumber: options.channelNumber,
                    prefix: options.prefix,
                    build: options.build,
                })
            } else {
                throw new Error('No version increment option specified')
            }
        }
    
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