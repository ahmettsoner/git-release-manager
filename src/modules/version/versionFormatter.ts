import semver from 'semver'

interface IncrementOptions {
    channel?: string
    channelNumber?: boolean
    prefix?: string
    prerelease?: string
    build?: string
}

interface VersionConfig {
    defaultPrefix?: string
    defaultChannel?: string
    protectedVersions?: string[]
}

export const incrementChannelOnly = (version: string, options: IncrementOptions): string => {
    const { channel, channelNumber, prefix, build } = options

    if (!channel) {
        throw new Error('Channel must be specified for channel-only increment')
    }

    // Remove prefix if exists for processing
    let versionWithoutPrefix = prefix ? version.replace(prefix, '') : version

    // Remove build metadata for processing
    versionWithoutPrefix = versionWithoutPrefix.split('+')[0]

    if (!semver.valid(versionWithoutPrefix)) {
        throw new Error(`Invalid version format: ${version}`)
    }

    // Get the base version without prerelease or build metadata
    const baseVersion = versionWithoutPrefix.split('-')[0]
    let newVersion: string

    if (!channelNumber) {
        // Simple channel without number
        newVersion = `${baseVersion}-${channel}`
    } else {
        // Check current prerelease information
        const currentPrerelease = semver.prerelease(versionWithoutPrefix)

        if (currentPrerelease) {
            if (currentPrerelease[0] === channel) {
                // Same channel: increment the number
                const currentNumber = parseInt(currentPrerelease[1] as string, 10) || 0
                newVersion = `${baseVersion}-${channel}.${currentNumber + 1}`
            } else {
                // Different channel: start new sequence
                newVersion = `${baseVersion}-${channel}.1`
            }
        } else {
            // No previous prerelease: start new sequence
            newVersion = `${baseVersion}-${channel}.1`
        }
    }

    // Add build metadata if specified
    if (build) {
        newVersion = `${newVersion}+${build}`
    }

    // Add prefix back if specified
    return prefix ? `${prefix}${newVersion}` : newVersion
}

// Update incrementVersion function to handle undefined versionType
export const incrementVersion = (version: string, type: VersionType, options: IncrementOptions = {}): string => {
    const { channel, channelNumber, prefix, prerelease, build } = options

    // Remove prefix if exists for processing
    let versionWithoutPrefix = prefix ? version.replace(prefix, '') : version

    // Remove build metadata for processing (will be added back later)
    versionWithoutPrefix = versionWithoutPrefix.split('+')[0]

    if (!semver.valid(versionWithoutPrefix)) {
        throw new Error(`Invalid version format: ${version}`)
    }

    // Get the base version without prerelease or build metadata
    const baseVersion = versionWithoutPrefix.split('-')[0]

    // Increment the base version according to type
    const incrementedVersion = semver.inc(baseVersion, type) || baseVersion

    // Build the final version string
    let newVersion = incrementedVersion

    // Add channel/prerelease information
    if (channel || prerelease) {
        const prereleaseIdentifier = channel || prerelease

        if (!channelNumber) {
            newVersion = `${newVersion}-${prereleaseIdentifier}`
        } else {
            // Check if current version has the same prerelease identifier
            const currentPrerelease = semver.prerelease(versionWithoutPrefix)
            if (currentPrerelease && currentPrerelease[0] === prereleaseIdentifier) {
                // If version type changed, reset prerelease number to 1
                if (semver.gt(incrementedVersion, baseVersion)) {
                    newVersion = `${newVersion}-${prereleaseIdentifier}.1`
                } else {
                    // Increment prerelease number
                    const currentNumber = parseInt(currentPrerelease[1] as string, 10) || 0
                    newVersion = `${newVersion}-${prereleaseIdentifier}.${currentNumber + 1}`
                }
            } else {
                // Start new prerelease sequence
                newVersion = `${newVersion}-${prereleaseIdentifier}.1`
            }
        }
    }

    // Add build metadata if specified
    if (build) {
        newVersion = `${newVersion}+${build}`
    }

    // Add prefix back if specified
    return prefix ? `${prefix}${newVersion}` : newVersion
}
