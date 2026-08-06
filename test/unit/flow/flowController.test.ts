import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { Config } from '../../../src/config/types/Config'
import { FlowController } from '../../../src/modules/flow/FlowController'

/**
 * The DECLARED flow: promote a branch, derive the version from the commits, tag.
 *
 * WHAT IS AT RISK. Every case here is a way the flow reports success while
 * producing a number, a branch state or a tag that is wrong:
 *
 *   1. THE VERSION COMES FROM SOMEWHERE OTHER THAN THE HISTORY. `branch finish`
 *      reads it from the branch NAME, so the commitTypes taxonomy is bypassed on
 *      the one path where it decides a release. F2 pins derive-from-range.
 *   2. THE PLAN AND THE RUN DISAGREE. Measured while building this: the plan
 *      derived over `tag..main` — empty before the merge — answered v1.0.1, and
 *      the run then correctly cut v1.1.0. A plan that lies about the number is
 *      worse than no plan. F3 pins equality.
 *   3. A PRERELEASE DRIFTS OFF ITS LINE. Its core belongs to the release line
 *      and its counter to the channel; with one baseline this answered
 *      v0.0.1-dev.1 on a repo at v1.1.0, and the next cut recomputed the same
 *      string and died on an existing tag. F4 pins both baselines.
 *   4. A FAST-FORWARD PROMOTION. It moves the ref and creates no commit, so a
 *      pre-merge hook never runs and every gate hung on the promotion silently
 *      does not execute. F5 pins that no-ff is the default.
 *   5. THE SOURCE BRANCH IS DELETED. On a long-lived integration line that is an
 *      outage, not a cleanup. F6 pins the default and the opt-in.
 *   6. A VERSION FOR NO CHANGE. F7 pins the empty-promotion refusal.
 *   7. THE WORKTREE PATH LEAVES THE BRANCH BEHIND. The merge lands on a detached
 *      HEAD, so the branch only moves if update-ref runs. F8 pins it.
 */

let root: string

function git(...args: string[]): string {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
}

function commit(msg: string, body = ''): void {
    // The body goes into the COMMIT, not into the file: noteTypes are matched
    // against the message body, and writing `BREAKING CHANGE` into f.txt makes a
    // major-bump case that silently tests a minor one.
    writeFileSync(join(root, 'f.txt'), `${msg}\n`, { flag: 'a' })
    git('add', '-A')
    git('commit', '-q', '-m', msg, ...(body ? ['-m', body] : []))
}

function cfg(flow: any, extra: any = {}): Config {
    return {
        tag: { prefix: 'v' },
        commitTypes: [
            { type: 'feature', terms: ['feat'], title: 'Features', order: 1, bump: 'minor' },
            { type: 'fix', terms: ['fix'], title: 'Fixes', order: 2, bump: 'patch' },
        ],
        noteTypes: [
            { type: 'breaking-change', sign: '!', terms: ['BREAKING CHANGE'], bump: 'major' },
        ],
        versioning: { defaultBump: 'patch' },
        flow,
        ...extra,
    } as unknown as Config
}

const PHASES = {
    dev: { branch: 'dev', channel: 'dev' },
    prod: { branch: 'main', mergeFrom: 'dev' },
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'grm-flow-'))
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Test')
    commit('feat: base')
    git('tag', '-a', 'v1.0.0', '-m', 'v1.0.0')
    git('checkout', '-q', '-b', 'dev')
})

afterEach(() => {
    rmSync(root, { recursive: true, force: true })
})

describe('FlowController', () => {
    describe('F1 the declaration is the contract', () => {
        it('refuses an unknown phase, naming the declared ones', () => {
            const f = new FlowController(cfg({ phases: PHASES }), root)
            expect(() => f.phase('staging')).toThrow(/Unknown phase 'staging'.*dev, prod/s)
        })

        it('refuses when nothing is declared', () => {
            expect(() => new FlowController(cfg(undefined), root).phase('prod'))
                .toThrow(/No flow is declared/)
        })

        it('refuses a phase with no branch', () => {
            const f = new FlowController(cfg({ phases: { x: {} } }), root)
            expect(() => f.phase('x')).toThrow(/declares no branch/)
        })
    })

    describe('F2 the number comes from the commit range', () => {
        it('a feat in the range moves the minor, with nothing named after it', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            const { version, current } = await f.nextVersion(f.phase('prod'))
            expect(current).toBe('v1.0.0')
            expect(version).toBe('v1.1.0')
        })

        it('only fixes derive a patch', async () => {
            commit('fix: a small fix')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            expect((await f.nextVersion(f.phase('prod'))).version).toBe('v1.0.1')
        })

        it('a breaking-change note moves the major', async () => {
            commit('feat: a capability', 'BREAKING CHANGE: the api moved')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            expect((await f.nextVersion(f.phase('prod'))).version).toBe('v2.0.0')
        })

        it('derive: false falls to the configured default', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(
                cfg({ phases: { prod: { branch: 'main', mergeFrom: 'dev', derive: false } } }), root)
            expect((await f.nextVersion(f.phase('prod'))).version).toBe('v1.0.1')
        })
    })

    describe('F3 the plan and the run agree', () => {
        it('the planned number is the number cut', async () => {
            commit('feat: a capability')
            commit('fix: a small fix')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            const planned = (await f.plan('prod')).next
            const done = await f.run('prod')
            expect(planned).toBe('v1.1.0')
            expect(done.next).toBe(planned)
            expect(done.tagged).toBe(planned)
        })

        it('the plan writes nothing', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const before = git('rev-parse', 'main').trim()
            const f = new FlowController(cfg({ phases: PHASES }), root)
            await f.plan('prod')
            expect(git('rev-parse', 'main').trim()).toBe(before)
            expect(git('tag', '-l').trim()).toBe('v1.0.0')
        })

        it('the tag lands on the merge commit, which is what carries the work', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            const done = await f.run('prod')
            expect(git('rev-list', '-1', done.tagged!).trim()).toBe(done.mergeCommit)
            expect(git('rev-parse', 'main').trim()).toBe(done.mergeCommit)
        })
    })

    describe('F4 a prerelease has two baselines', () => {
        it('the core comes from the release line, not from 0.0.0', async () => {
            commit('feat: a capability')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            expect((await f.nextVersion(f.phase('dev'))).version).toBe('v1.1.0-dev.1')
        })

        it('the counter advances within one core', async () => {
            commit('feat: a capability')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            expect((await f.run('dev')).tagged).toBe('v1.1.0-dev.1')
            commit('fix: a small fix')
            expect((await f.run('dev')).tagged).toBe('v1.1.0-dev.2')
        })

        it('a new core restarts the counter at 1', async () => {
            commit('feat: a capability')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            await f.run('dev')                                  // v1.1.0-dev.1
            git('checkout', '-q', 'main')
            await f.run('prod')                                 // v1.1.0
            git('checkout', '-q', 'dev')
            git('merge', '-q', '--no-edit', 'main')
            commit('feat: the next cycle')
            expect((await f.run('dev')).tagged).toBe('v1.2.0-dev.1')
        })

        it('a stable phase never adopts a prerelease as its baseline', async () => {
            commit('feat: a capability')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            await f.run('dev')                                  // v1.1.0-dev.1 exists
            git('checkout', '-q', 'main')
            // The stable baseline must still be v1.0.0; adopting the prerelease
            // would carry `-dev.1` into the release line and never leave it.
            expect((await f.nextVersion(f.phase('prod'))).current).toBe('v1.0.0')
            expect((await f.nextVersion(f.phase('prod'))).version).toBe('v1.1.0')
        })
    })

    describe('F5 the merge strategy', () => {
        it('creates a merge commit by default, so a pre-merge hook can run', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            const done = await f.run('prod')
            // Two parents = a real merge commit. A fast-forward has one.
            expect(git('rev-list', '--parents', '-1', done.mergeCommit!).trim().split(/\s+/).length).toBe(3)
        })

        it('ff has to be asked for in writing', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(
                cfg({ phases: { prod: { branch: 'main', mergeFrom: 'dev', merge: 'ff' } } }), root)
            const done = await f.run('prod')
            expect(git('rev-list', '--parents', '-1', done.mergeCommit!).trim().split(/\s+/).length).toBe(2)
        })
    })

    describe('F6 deleting the source is opt-in', () => {
        it('the source branch survives by default', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            await new FlowController(cfg({ phases: PHASES }), root).run('prod')
            expect(git('branch', '--list', 'dev').trim()).toContain('dev')
        })

        it('deleteSource: true removes it', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(
                cfg({ phases: { prod: { branch: 'main', mergeFrom: 'dev', deleteSource: true } } }), root)
            await f.run('prod')
            expect(git('branch', '--list', 'dev').trim()).toBe('')
        })
    })

    describe('F7 a version is never minted for no change', () => {
        it('refuses when the source carries nothing new', async () => {
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg({ phases: PHASES }), root)
            await expect(f.run('prod')).rejects.toThrow(/nothing to promote/i)
        })
    })

    describe('F8 the worktree path', () => {
        const wtFlow = { worktree: { enabled: true, dir: '.grm/wt' }, phases: PHASES }

        it('moves the branch even though the merge lands detached', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const before = git('rev-parse', 'main').trim()
            const f = new FlowController(cfg(wtFlow), root)
            const done = await f.run('prod')
            expect(git('rev-parse', 'main').trim()).toBe(done.mergeCommit)
            expect(git('rev-parse', 'main').trim()).not.toBe(before)
        })

        it('leaves nothing behind', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            await new FlowController(cfg(wtFlow), root).run('prod')
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(false)
            expect(git('worktree', 'list').trim().split('\n').length).toBe(1)
        })

        it('keep: true leaves it for inspection', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(
                cfg({ worktree: { enabled: true, dir: '.grm/wt', keep: true }, phases: PHASES }), root)
            await f.run('prod')
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(true)
        })

        it('refuses a worktree directory it does not own', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            // A directory that merely LOOKS like ours may hold in-flight work.
            execFileSync('mkdir', ['-p', join(root, '.grm/wt/flow-prod')])
            const f = new FlowController(cfg(wtFlow), root)
            await expect(f.run('prod')).rejects.toThrow(/owner marker/)
        })
    })
})
