import semver from 'semver';

interface IncrementOptions {
  channel?: string;
  channelNumber?: boolean;
  prefix?: string;
  prerelease?: string;
  build?: string;
}

type VersionType = 'major' | 'minor' | 'patch' | undefined;

export const incrementVersion = (
  version: string,
  type: VersionType,
  options: IncrementOptions = {}
): string => {
  const { prefix, build, channel, prerelease, channelNumber } = options;
  let versionWithoutPrefix = removePrefixAndBuild(version, prefix);

  if (!semver.valid(versionWithoutPrefix)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  let newVersion = type ? incrementVersionCore(versionWithoutPrefix, type) : versionWithoutPrefix;

  if (channel || prerelease) {
    // Clear any existing prerelease if type is specified (since it means a new increment)
    if (type) {
      newVersion = clearPrerelease(newVersion);
    }
    newVersion = addPrereleaseOrChannel(newVersion, versionWithoutPrefix, options);
  }

  if (build) {
    newVersion = `${newVersion}+${build}`;
  }

  return finalizeVersion(newVersion, prefix);
};

const incrementVersionCore = (version: string, type: VersionType): string => {
  return semver.inc(version, type!) ?? version;
};

const removePrefixAndBuild = (version: string, prefix?: string): string => {
  let baseVersion = prefix ? version.replace(prefix, '') : version;
  return baseVersion.split('+')[0];
};
const addPrereleaseOrChannel = (
  baseVersion: string,
  versionWithoutPrefix: string,
  options: IncrementOptions
): string => {
  const { channel, channelNumber, prerelease } = options;

  if (prerelease) {
    // For prerelease, append without a numerical suffix
    // If there's an existing prerelease, return it as it is
    if (semver.prerelease(baseVersion)) {
      return baseVersion;
    }
    return `${baseVersion}-${prerelease}`;
  }

  if (channel) {
    const currentPrerelease = semver.prerelease(baseVersion);
    const isExistingChannel = currentPrerelease && currentPrerelease[0] === channel;

    if (isExistingChannel && channelNumber) {
      const currentNumber = parseInt(currentPrerelease[1] as string, 10) || 0;
      return `${baseVersion.split('-')[0]}-${channel}.${currentNumber + 1}`;
    }

    if (!channelNumber) {
      // If there is no -channel suffix or channelNumber is false, append channel without number
      return `${baseVersion.split('-')[0]}-${channel}`;
    } else {
      // If no existing channel, and channelNumber is true, start numbering from .1
      return `${baseVersion.split('-')[0]}-${channel}.1`;
    }
  }

  return baseVersion;
};
const clearPrerelease = (version: string): string => {
  return version.split('-')[0];
};

const finalizeVersion = (version: string, prefix?: string): string => {
  return prefix ? `${prefix}${version}` : version;
};