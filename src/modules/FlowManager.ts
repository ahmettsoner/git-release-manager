import simpleGit, { SimpleGit } from 'simple-git'
import semver from 'semver'

/*
Burda akış sonra ki step'e merge edilmemiş olan en son version'u işleyecek şekilde kuvvetlendiilmeli
*/

type Config = {
    tagPrefix: string;
    releasePrefix: string;
    defaultDevChannel: string;
    defaultReleaseChannel: string;
    strictTagBranch: boolean;
    phases: {
        dev: PhaseConfig,
        qa: PhaseConfig,
        stage: PhaseConfig,
        prod: PhaseConfig,
    };
}
type ChannelConfig = {
    startBuildNumber: number;
}
type PhaseConfig = {
    channels: Record<string, ChannelConfig>;
}


export class FlowManager {
    private readonly git: SimpleGit = simpleGit()
    private readonly defaultBaseVersion = '1.0.0'

    
    private readonly config: Config = {
        tagPrefix: 'v',
        releasePrefix: 'release/',
        defaultDevChannel: 'dev',
        defaultReleaseChannel: 'alpha',
        strictTagBranch: true,
        phases: {
            dev: {
                channels: {
                    dev: {
                        startBuildNumber : 1
                    },
                }
            },
            qa: {
                channels: {
                    alpha: {
                        startBuildNumber : 1
                    },
                }
            },
            stage: {
                channels: {
                    beta: {
                        startBuildNumber : 1
                    },
                }
            },
            prod: {
                channels: {
                    stabil: {
                        startBuildNumber : 1
                    },
                }
            }
        }
    };

    constructor(config?: Partial<typeof this.config>) {
        if (config) {
            this.config = { 
                ...this.config, 
                ...config, 
                phases:{
                    ...this.config.phases,
                    ...config.phases,
                    dev: {
                        channels:{
                            ...this.config.phases.dev.channels,
                            ...config.phases?.dev.channels
                        }
                    },
                    qa: {
                        channels:{
                            ...this.config.phases.qa.channels,
                            ...config.phases?.qa.channels
                        }
                    },
                    stage: {
                        channels:{
                            ...this.config.phases.stage.channels,
                            ...config.phases?.stage.channels
                        }
                    },
                    prod: {
                        channels:{
                            ...this.config.phases.prod.channels,
                            ...config.phases?.prod.channels
                        }
                    }
                }
            };
        }
    }
    /**
     * `flow phase <x>` selects what to compute through mutually exclusive mode
     * flags (--next, --current, --next-release, --next-fix, --previous,
     * --previous-fix). With none of them the Determine* methods used to leave
     * `result` at '' and still print the tag prefix, so `grm flow phase dev`
     * answered a bare "v" and exited 0 -- a wrong answer that looked like a
     * successful one. "Give me the next build number" is the only mode every
     * phase supports, so it is the default; no invocation is left without one.
     */
    private applyDefaultMode(options: any): any {
        const opts = options ?? {}
        const hasMode =
            opts.next ||
            opts.current ||
            opts.nextRelease ||
            opts.nextFix ||
            opts.previous ||
            opts.previousFix
        return hasMode ? opts : { ...opts, next: true }
    }

    getVersionPart(version: string, options: any): string {


        const parsedVersion = semver.parse(version)
        if (!parsedVersion) {
            return ''
        }

        if(options.print){
            switch (options.print) {
                case 'base':
                    return `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`
                case 'channel':
                    return `${parsedVersion.prerelease.join('.')}`
                case 'build':
                    return `${parsedVersion.prerelease[1]?.toString()}` || ''
                default:
                    return parsedVersion.version
            }
        }
        return parsedVersion.version;

    }

    /**
     * @param includePrerelease  With no `channel`, the pattern below anchors on
     *   the patch digit, so it matches ONLY stable tags -- v1.1.0-dev.1 is
     *   dropped. The phase computation depends on that:
     *   DetermineProductionPhaseVersion asks for the latest tag on a
     *   release/X.Y.Z branch with channel=null precisely to ignore the alpha
     *   and beta tags merged into it. But the `flow tag` query verbs inherited
     *   the same filter, so `flow tag latest dev` answered "" on a dev branch
     *   whose every tag is a -dev.N prerelease. The filter is right for the
     *   computation and wrong for the query, so the query opts out of it.
     */
    async listBranchTags(branch: string, channel: string | null = null, includePrerelease: boolean = false): Promise<string[]> {
        try {
            let tagArgs = []
            if(this.config.strictTagBranch){
                tagArgs.push("--merged")
                tagArgs.push(branch)
            }

            const tags = await this.git.raw(['tag',  ...tagArgs]);


            let tagPattern = `${this.config.tagPrefix}[0-9]*\\.[0-9]*\\.[0-9]*`;
            if (channel) {
                tagPattern += `-${channel}\\.[0-9]*`;
            } else if (includePrerelease) {
                tagPattern += `(-.+)?`;
            }

            const regexPattern = tagPattern.replace(/\\\*/g, '.*').replace(/\\\./g, '\\.');
            const regex = new RegExp(`^${regexPattern}$`);
    
            const tagList = tags
                .split('\n')
                .map((tag: string) => tag.trim())
                .filter(tag => regex.test(tag));
    
            return tagList;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Tag listing error: ${error.message}`);
            } else {
                console.error('Tag listing error: Unknown error type');
            }
            return [];
        }
    }

    async latestTagVersion(branch: string, channel: string | null = null, baseVersion: string | null = null, includePrerelease: boolean = false): Promise<string> {
        try {
            // The channel-qualified prefix only exists once there IS a base
            // version to qualify. Written as `channel ? ...` it interpolated a
            // null into the string — a caller asking for the latest `dev` tag
            // without naming a base filtered every tag against the literal
            // "null-dev" and got nothing back. Channel alone is already honoured
            // one line down: listBranchTags builds the pattern from it.
            const channelVersion = baseVersion ? (channel ? `${baseVersion}-${channel}` : baseVersion) : null;

            const tagList = await this.listBranchTags(branch, channel, includePrerelease);
    
            if (!tagList) {
                return ''
            }

            let filteredTags = tagList;
            if(channelVersion){
                filteredTags = tagList?.filter(tag => tag.startsWith(channelVersion)) || [];
            }
    
            const latestTag = filteredTags.sort(semver.rcompare)[0];
    
            if (!latestTag) {
                return '';
            }
    
            const parsedVersion = semver.parse(latestTag);
            return parsedVersion ? latestTag : '';
        } catch (error) {
            console.error('Could not retrieve tags:', error instanceof Error ? error.message : error);
            return '';
        }
    }

    async listReleaseBranches(channel: string | null = null): Promise<string[]> {
        try {
            let branchPattern = `${this.config.releasePrefix}${this.config.tagPrefix}[0-9]*\\.[0-9]*\\.[0-9]*`;
            if (channel) {
                branchPattern += `-${channel}`;
            }
    
            const result = await this.git.raw(['branch', '--list', branchPattern]);
    
            const regexPattern = branchPattern.replace(/\\\*/g, '.*').replace(/\\\./g, '\\.');
            const regex = new RegExp(`^${regexPattern}$`);
    
            const branches = result
                .split('\n')
                .map(line => line.replace('*', '').trim())
                .filter(line => regex.test(line)); 


            return branches;
        } catch (error) {
            console.error(`Error listing branches: ${error}`);
            return [];
        }
    }

    async latestReleaseBranchVersion(channel: string | null = null): Promise<string> {
        try {
            const branches = await this.listReleaseBranches(channel)

            const latestBranch = branches
                .map(branch => branch.replace(this.config.releasePrefix, ''))
                .map(branch => branch.replace(this.config.tagPrefix, ''))
                .filter(version => semver.valid(version))
                .sort(semver.rcompare)[0];


            if (!latestBranch) {
                return ''
            }

            const parsedVersion = semver.parse(latestBranch)
            if (!parsedVersion) {
                return ''
            }

            return latestBranch ? `${this.config.tagPrefix}${latestBranch}` : '';
        } catch (error) {
            console.error('Could not retrieve tags:', error)
            return ''
        }
    }


    async DetermineDevPhaseVersion(branch: string, options?: any) {
        try {
            options = this.applyDefaultMode(options)
            const channel = this.config.defaultDevChannel;

            let hasAnyDefaultReleaseChannelVersion = true
            let latestReleaseBranchVersion = await this.latestReleaseBranchVersion(this.config.defaultReleaseChannel)
            if (!latestReleaseBranchVersion) {
                latestReleaseBranchVersion = this.defaultBaseVersion
                hasAnyDefaultReleaseChannelVersion = false
            }else {
                latestReleaseBranchVersion = this.getVersionPart(latestReleaseBranchVersion, { print: 'base' })
            }
            const baseVersion = `${this.config.tagPrefix}${latestReleaseBranchVersion}`;
            const latestChannelTagVersion = await this.latestTagVersion(branch, channel, baseVersion)
            
            let result = ''
            if (options.next) {
                if (!hasAnyDefaultReleaseChannelVersion) {
                    if (!latestChannelTagVersion) {
                        result = `${this.config.tagPrefix}${this.defaultBaseVersion}-${channel}.${this.config.phases.dev.channels[channel].startBuildNumber}`;
                    } else {
                        const incrementedVersion = semver.inc(latestChannelTagVersion, 'prerelease', channel)
                        result = `${this.config.tagPrefix}${incrementedVersion}`;
                    }
                } else {
                    // Compare release version with dev version
                    if (!latestChannelTagVersion || semver.gt(latestReleaseBranchVersion, latestChannelTagVersion)) {
                        // If release version is greater, bump the minor version from release version
                        const newBaseVersion = semver.inc(latestReleaseBranchVersion, 'minor')
                        result = `${this.config.tagPrefix}${newBaseVersion}-${channel}.${this.config.phases.dev.channels[channel].startBuildNumber}`;
                    } else {
                        // Otherwise increment the channel number of the latest dev version
                        const incrementedDevVersion = semver.inc(latestChannelTagVersion, 'prerelease', channel)
                        result = `${this.config.tagPrefix}${incrementedDevVersion}`;
                    }
                }
            } else if (options.current) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.dev.channels[channel].startBuildNumber}`;
                } else {
                    result = latestChannelTagVersion
                }
            }

            return `${this.config.tagPrefix}${this.getVersionPart(result, options)}`;

        } catch (error) {
            if (error instanceof Error) {
                console.error(`Tag listeleme hatası: ${error.message}`)
            } else {
                console.error('Tag listeleme hatası: Bilinmeyen hata türü')
            }
        }
    }
    async DetermineQAPhaseVersion(channel: string, baseVersion?: string, options?: any) {
        try {
            options = this.applyDefaultMode(options)
            if (!baseVersion) {
                let latestReleaseBranchBaseVersion = await this.latestReleaseBranchVersion(channel)
                if (!latestReleaseBranchBaseVersion) {
                    latestReleaseBranchBaseVersion = this.defaultBaseVersion
                }else{
                    latestReleaseBranchBaseVersion = this.getVersionPart(latestReleaseBranchBaseVersion, { print: 'base' })
                }
                baseVersion = `${this.config.tagPrefix}${latestReleaseBranchBaseVersion}`;
            }
            const latestChannelTagVersion = await this.latestTagVersion(`${this.config.releasePrefix}${baseVersion}-${channel}`, channel, baseVersion)

            let result = ''
            if (options.next) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.qa.channels[channel].startBuildNumber}`;
                } else {
                    const incrementedVersion = semver.inc(latestChannelTagVersion, 'prerelease', channel)
                    result = `${this.config.tagPrefix}${incrementedVersion}`;
                }
            } else if (options.nextRelease) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.qa.channels[channel].startBuildNumber}`;
                } else {
                    const incrementedVersion = semver.inc(baseVersion, 'minor')
                    result = `${this.config.tagPrefix}${incrementedVersion}-${channel}.${this.config.phases.qa.channels[channel].startBuildNumber}`;
                }
            } else if (options.current) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.qa.channels[channel].startBuildNumber}`;
                } else {
                    result = latestChannelTagVersion
                }
            }

            return `${this.config.tagPrefix}${this.getVersionPart(result, options)}`;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Tag listeleme hatası: ${error.message}`)
            } else {
                console.error('Tag listeleme hatası: Bilinmeyen hata türü')
            }
        }
    }
    async DetermineStagePhaseVersion(channel: string, baseVersion: string, options?: any) {
        try {
            options = this.applyDefaultMode(options)
            if (!baseVersion) {
                let latestReleaseBranchBaseVersion = await this.latestReleaseBranchVersion(channel)
                if (!latestReleaseBranchBaseVersion) {
                    latestReleaseBranchBaseVersion = this.defaultBaseVersion
                }else {
                    latestReleaseBranchBaseVersion = this.getVersionPart(latestReleaseBranchBaseVersion, { print: 'base' })
                }
                baseVersion = `${this.config.tagPrefix}${latestReleaseBranchBaseVersion}`;
            }
            const latestChannelTagVersion = await this.latestTagVersion(`${this.config.releasePrefix}${baseVersion}-${channel}`, channel, baseVersion)

            let result = ''
            if (options.next) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.stage.channels[channel].startBuildNumber}`;
                } else {
                    const incrementedVersion = semver.inc(latestChannelTagVersion, 'prerelease', channel)
                    result = `${this.config.tagPrefix}${incrementedVersion}`;
                }
            } else if (options.nextRelease) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.stage.channels[channel].startBuildNumber}`;
                } else {
                    const incrementedVersion = semver.inc(baseVersion, 'minor')
                    result = `${this.config.tagPrefix}${incrementedVersion}-${channel}.${this.config.phases.stage.channels[channel].startBuildNumber}`;
                }
            } else if (options.current) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}-${channel}.${this.config.phases.stage.channels[channel].startBuildNumber}`;
                } else {
                    result = latestChannelTagVersion
                }
            }

            return `${this.config.tagPrefix}${this.getVersionPart(result, options)}`;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Tag listeleme hatası: ${error.message}`)
            } else {
                console.error('Tag listeleme hatası: Bilinmeyen hata türü')
            }
        }
    }
    async DetermineProductionPhaseVersion(channelName: string, baseVersion: string, options?: any) {
        try {
            options = this.applyDefaultMode(options)
            let latestStableReleaseBranchBaseVersion = null
            if (!baseVersion) {
                // let latestReleaseBranchBaseVersion = await this.latestReleaseBranchVersion(channelName)
                // latestReleaseBranchBaseVersion = this.getVersionPart(latestReleaseBranchBaseVersion, { print: 'base' })
                // if (!latestReleaseBranchBaseVersion) {
                //     latestReleaseBranchBaseVersion = this.defaultBaseVersion
                // }
                latestStableReleaseBranchBaseVersion = await this.latestReleaseBranchVersion()
                latestStableReleaseBranchBaseVersion = this.getVersionPart(latestStableReleaseBranchBaseVersion, { print: 'base' })
                if (!latestStableReleaseBranchBaseVersion) {
                    baseVersion = this.defaultBaseVersion
                }else{
                    baseVersion = `${this.config.tagPrefix}${latestStableReleaseBranchBaseVersion}`
                }
            }
            const latestChannelTagVersion = await this.latestTagVersion(`${this.config.releasePrefix}${baseVersion}`, null, baseVersion)

            let result = ''
            if (options.next) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}`
                } else {
                    result = `${latestChannelTagVersion}`
                }
            } else if (options.nextRelease) {
                if (!latestChannelTagVersion && !latestStableReleaseBranchBaseVersion) {
                    result = `${baseVersion}`
                } else {
                    const incrementedVersion = semver.inc(baseVersion, 'minor')
                    result = `${this.config.tagPrefix}${incrementedVersion}`
                }
            } else if (options.nextFix) {
                if (!latestChannelTagVersion && !latestStableReleaseBranchBaseVersion) {
                    result = `${baseVersion}`
                } else {
                    const incrementedVersion = semver.inc(baseVersion, 'patch')
                    result = `${this.config.tagPrefix}${incrementedVersion}`
                }
            } else if (options.current) {
                if (!latestChannelTagVersion) {
                    result = `${baseVersion}`
                } else {
                    result = latestChannelTagVersion
                }
            } else if (options.previous) {
                result = await this.latestTagVersion('main')
            } else if (options.previousFix) {
                    const latestMainVersion = await this.latestTagVersion(`main`)
                    const incrementedVersion = semver.inc(latestMainVersion, 'patch')
                    result = `${this.config.tagPrefix}${incrementedVersion}`
            }

            return `${this.config.tagPrefix}${this.getVersionPart(result, options)}`;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Tag listeleme hatası: ${error.message}`)
            } else {
                console.error('Tag listeleme hatası: Bilinmeyen hata türü')
            }
        }
    }

    private escapeForRegex(input: string): string {
        return input.replace(/\./g, '\\.');
    }
}
