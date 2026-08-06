import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { Config } from '../../../src/config/types/Config'
import { VersionStamper } from '../../../src/modules/version/VersionStamper'

/**
 * VersionStamper — the config-driven version stamp.
 *
 * WHAT IS AT RISK. This writes into a working tree and can commit. Three ways
 * it goes wrong quietly, each pinned below:
 *
 *   1. A PATTERN THAT MATCHES NOTHING is reported as success. The file exists,
 *      the run says "stamped", and the version is not in it — the exact failure
 *      the feature exists to prevent, delivered by the feature.
 *   2. THE COMMIT PICKS UP WORK IT DID NOT DO. On a shared checkout a peer's
 *      staged file joins the stamp commit. The add must be a pathspec.
 *   3. IT WRITES ON A DRY RUN, or commits when nothing changed.
 */

function cfg(stamp: any): Config {
    return { versioning: { stamp } } as unknown as Config
}

let root: string

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'grm-stamp-'))
})

afterEach(() => {
    rmSync(root, { recursive: true, force: true })
})

function write(rel: string, body: string) {
    const abs = join(root, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, body)
    return abs
}

function git(...args: string[]) {
    // execFile, not exec: joining argv into a shell string splits `-m add
    // manifest` into three words and the commit fails on a pathspec that was
    // never a path.
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
}

function initRepo() {
    git('init', '-q')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Test')
    git('commit', '-q', '--allow-empty', '-m', 'root')
}

describe('VersionStamper', () => {
    it('writes the version where the pattern points', async () => {
        write('manifest.yaml', 'name: thing\nversion: 0.9.0\nkind: plugin\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'manifest.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        const r = await s.stamp('1.2.3')
        expect(r.stamped).toEqual(['manifest.yaml'])
        expect(readFileSync(join(root, 'manifest.yaml'), 'utf8'))
            .toBe('name: thing\nversion: 1.2.3\nkind: plugin\n')
    })

    it('strips a line prefix for {versionCore}', async () => {
        write('m.yaml', 'version: 0.0.1\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {versionCore}' }] }),
            root
        )
        await s.stamp('v4.5.6')
        // A tag prefix names the LINE; a semver field cannot hold it.
        expect(readFileSync(join(root, 'm.yaml'), 'utf8')).toBe('version: 4.5.6\n')
    })

    it('anchors per line by default', async () => {
        // Without the `m` flag `^version:` can only match the first line, and a
        // manifest whose version is not on line 1 silently goes unstamped.
        write('m.yaml', 'name: thing\nversion: 0.9.0\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        expect((await s.stamp('2.0.0')).stamped).toEqual(['m.yaml'])
    })

    it('reports an unmatched pattern instead of claiming a stamp', async () => {
        write('m.yaml', 'name: thing\n')            // no version line at all
        const s = new VersionStamper(
            cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        const r = await s.stamp('1.0.0')
        expect(r.stamped).toEqual([])
        expect(r.unmatched).toEqual(['m.yaml'])
        expect(VersionStamper.describe(r)).toContain('UNMATCHED')
    })

    it('throws when a required file is absent or unmatched', async () => {
        const s1 = new VersionStamper(
            cfg({ files: [{ path: 'nope.yaml', pattern: 'x', replace: 'y', required: true }] }),
            root
        )
        await expect(s1.stamp('1.0.0')).rejects.toThrow(/nope\.yaml/)

        write('there.yaml', 'nothing here\n')
        const s2 = new VersionStamper(
            cfg({ files: [{ path: 'there.yaml', pattern: '^version:.*$', replace: 'v', required: true }] }),
            root
        )
        await expect(s2.stamp('1.0.0')).rejects.toThrow(/found nothing in required file/)
    })

    it('skips an absent optional file without failing', async () => {
        const s = new VersionStamper(
            cfg({ files: [{ path: 'absent.yaml', pattern: 'x', replace: 'y' }] }),
            root
        )
        const r = await s.stamp('1.0.0')
        expect(r.missing).toEqual(['absent.yaml'])
        expect(r.stamped).toEqual([])
    })

    it('expands a wildcard over one directory', async () => {
        write('plugins/a.plugin.yaml', 'version: 0.1.0\n')
        write('plugins/b.plugin.yaml', 'version: 0.1.0\n')
        write('plugins/notes.md', 'version: 0.1.0\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'plugins/*.plugin.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        const r = await s.stamp('3.0.0')
        expect(r.stamped.sort()).toEqual(['plugins/a.plugin.yaml', 'plugins/b.plugin.yaml'])
        expect(readFileSync(join(root, 'plugins/notes.md'), 'utf8')).toBe('version: 0.1.0\n')
    })

    it('writes nothing on a dry run', async () => {
        write('m.yaml', 'version: 0.9.0\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        const r = await s.stamp('1.2.3', { dryRun: true })
        expect(r.stamped).toEqual(['m.yaml'])                        // it WOULD stamp
        expect(readFileSync(join(root, 'm.yaml'), 'utf8')).toBe('version: 0.9.0\n')  // …and did not
    })

    it('counts a file already at this version as unchanged, not stamped', async () => {
        write('m.yaml', 'version: 1.2.3\n')
        const s = new VersionStamper(
            cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
            root
        )
        const r = await s.stamp('1.2.3')
        expect(r.stamped).toEqual([])
        expect(r.unchanged).toEqual(['m.yaml'])
    })

    describe('commit', () => {
        it('commits only what it stamped', async () => {
            initRepo()
            write('m.yaml', 'version: 0.9.0\n')
            git('add', '-A'); git('commit', '-q', '-m', 'add manifest')

            // A PEER'S staged work, sitting in the same index — the shared
            // checkout this tool runs on. A `git add -a`/`add .` would carry it.
            write('peer.txt', 'someone else\n')
            git('add', 'peer.txt')

            const s = new VersionStamper(
                cfg({
                    files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }],
                    commit: { enabled: true, message: 'chore: stamp {version}' },
                }),
                root
            )
            const r = await s.stamp('1.2.3')
            expect(r.commit).toBeTruthy()

            const files = git('show', '--name-only', '--pretty=format:', 'HEAD').trim().split('\n').filter(Boolean)
            expect(files).toEqual(['m.yaml'])
            expect(git('log', '-1', '--pretty=%s').trim()).toBe('chore: stamp 1.2.3')
            // The peer's file is still staged and still uncommitted.
            expect(git('diff', '--cached', '--name-only').trim()).toBe('peer.txt')
        })

        it('makes no commit when nothing changed', async () => {
            initRepo()
            write('m.yaml', 'version: 1.2.3\n')
            git('add', '-A'); git('commit', '-q', '-m', 'add manifest')
            const before = git('rev-parse', 'HEAD').trim()

            const s = new VersionStamper(
                cfg({
                    files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }],
                    commit: { enabled: true },
                }),
                root
            )
            const r = await s.stamp('1.2.3')
            expect(r.commit).toBeUndefined()
            expect(git('rev-parse', 'HEAD').trim()).toBe(before)
        })

        it('does not commit when commit.enabled is absent', async () => {
            initRepo()
            write('m.yaml', 'version: 0.9.0\n')
            git('add', '-A'); git('commit', '-q', '-m', 'add manifest')

            const s = new VersionStamper(
                cfg({ files: [{ path: 'm.yaml', pattern: '^version:.*$', replace: 'version: {version}' }] }),
                root
            )
            const r = await s.stamp('1.2.3')
            expect(r.stamped).toEqual(['m.yaml'])
            expect(r.commit).toBeUndefined()
            // Written, left dirty — the caller decides.
            expect(git('status', '--porcelain').trim()).toContain('m.yaml')
        })
    })

    describe('opt-in', () => {
        it('is inert with no config', async () => {
            const s = new VersionStamper({} as Config, root)
            expect(s.configured).toBe(false)
            expect(s.onBump).toBe(false)
            expect((await s.stamp('1.0.0')).stamped).toEqual([])
        })

        it('onBump requires both a file list and the flag', async () => {
            expect(new VersionStamper(cfg({ onBump: true }), root).onBump).toBe(false)
            const withFiles = cfg({ files: [{ path: 'x', pattern: 'a', replace: 'b' }] })
            expect(new VersionStamper(withFiles, root).onBump).toBe(false)
            const both = cfg({ files: [{ path: 'x', pattern: 'a', replace: 'b' }], onBump: true })
            expect(new VersionStamper(both, root).onBump).toBe(true)
        })
    })
})
