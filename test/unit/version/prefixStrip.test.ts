import { incrementVersion } from '../../../src/modules/version/versionFormatter'

// These cases exist because of a defect that only appeared when a caller kept
// the prefix as ITS OWN concern and handed over the bare semver core.
//
// `removePrefixAndBuild` stripped the prefix with `String.replace(prefix, '')`,
// which removes the first occurrence ANYWHERE in the string. A prefix is by
// definition only meaningful at the start, and with prefix `v`:
//
//   "1.0.28-dev.9".replace("v", "")  →  "1.0.28-de.9"
//
// The `v` inside `dev` was eaten. semver then read the channel as `de`, the
// caller's requested channel `dev` no longer matched it, and the channel was
// treated as NEW — resetting the counter to 1. So
//
//   incrementVersion("1.0.28-dev.9", undefined, { channel: "dev", prefix: "v" })
//
// answered v1.0.28-dev.1 instead of v1.0.28-dev.10, silently, on every call.
//
// WHY THAT MATTERED MORE THAN IT LOOKS. A prerelease line built on it never
// advances: every cut computes .1, the tag already exists, and the failure
// surfaces as a complaint about immutability rather than about arithmetic — so
// the number is the last place anyone looks. It stayed dormant for as long as no
// caller passed `--prefix`, and armed itself the day a project declared
// `tag.prefix` in its config and the version path started honouring it.
// channelNumber: true is what the CLI passes. `--no-channel-number` is a
// commander negated flag, so `channelNumber` is TRUE unless the operator opts
// out — a direct call that omits it grades a different mode (…-dev with no
// counter at all) and would pass or fail for reasons unrelated to the prefix.
describe('incrementVersion: the prefix is stripped only at the START', () => {
    it('advances a channel counter whose name CONTAINS the prefix letter', () => {
        expect(incrementVersion('1.0.28-dev.9', undefined, { channel: 'dev', prefix: 'v', channelNumber: true }))
            .toBe('v1.0.28-dev.10')
    })

    it('advances it from .1 too — the case a fresh line starts on', () => {
        expect(incrementVersion('1.0.0-dev.1', undefined, { channel: 'dev', prefix: 'v', channelNumber: true }))
            .toBe('v1.0.0-dev.2')
    })

    it('still strips a prefix that IS at the start', () => {
        expect(incrementVersion('v1.0.28-dev.9', undefined, { channel: 'dev', prefix: 'v', channelNumber: true }))
            .toBe('v1.0.28-dev.10')
    })

    it('is unaffected when no prefix is given — the shape that always worked', () => {
        expect(incrementVersion('1.0.28-dev.9', undefined, { channel: 'dev', channelNumber: true }))
            .toBe('1.0.28-dev.10')
    })

    // A multi-character prefix is the same question with more room to go wrong:
    // `gear-v` appears once here, and an unanchored replace would find it.
    it('anchors a multi-character prefix as well', () => {
        expect(incrementVersion('gear-v1.2.0-beta.4', undefined, { channel: 'beta', prefix: 'gear-v', channelNumber: true }))
            .toBe('gear-v1.2.0-beta.5')
    })

    // The counter must RESET when the channel genuinely changes — the behaviour
    // the defect was impersonating. Without this the fix above could be "always
    // increment", which is wrong in the other direction.
    it('starts a NEW channel at .1, which is what the defect looked like', () => {
        expect(incrementVersion('1.0.28-dev.9', undefined, { channel: 'rc', prefix: 'v', channelNumber: true }))
            .toBe('v1.0.28-rc.1')
    })
})
