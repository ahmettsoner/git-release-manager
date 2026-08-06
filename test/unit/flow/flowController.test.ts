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

    describe('F9 back-merge: a promotion is not a one-way trip', () => {
        const withBack = {
            phases: {
                dev: { branch: 'dev', channel: 'dev' },
                prod: { branch: 'main', mergeFrom: 'dev', backMerge: ['dev'] },
            },
        }

        it('the target returns to the source, so they stop diverging', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg(withBack), root)
            const done = await f.run('prod')
            expect(done.backMerged).toEqual({ dev: expect.any(String) })
            // THE PROPERTY THAT MATTERS: nothing on main is missing from dev. The
            // promotion's own merge commit used to be exactly that one commit, and
            // a rule saying "main advances only by a dev->main merge" then cannot
            // hold — the two have diverged by construction.
            expect(git('rev-list', '--count', 'dev..main').trim()).toBe('0')
        })

        it('…and the tag travels with it, so dev can describe the release', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg(withBack), root)
            const done = await f.run('prod')
            // The back-merge runs AFTER the tag on purpose.
            expect(git('describe', '--tags', 'dev').trim()).toContain(done.tagged!)
        })

        it('without it, main keeps a commit dev does not have', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            await new FlowController(cfg({ phases: PHASES }), root).run('prod')
            expect(parseInt(git('rev-list', '--count', 'dev..main').trim(), 10)).toBeGreaterThan(0)
        })

        it('a second promotion is then a clean integration', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(cfg(withBack), root)
            await f.run('prod')
            git('checkout', '-q', 'dev')
            commit('feat: more work')
            git('checkout', '-q', 'main')
            const second = await f.run('prod')
            expect(second.tagged).toBe('v1.2.0')
            expect(git('rev-list', '--count', 'dev..main').trim()).toBe('0')
        })

        it('merging a branch into itself is skipped, not attempted', async () => {
            commit('feat: a capability')
            git('checkout', '-q', 'main')
            const f = new FlowController(
                cfg({ phases: { prod: { branch: 'main', mergeFrom: 'dev', backMerge: ['main', 'dev'] } } }), root)
            const done = await f.run('prod')
            expect(Object.keys(done.backMerged ?? {})).toEqual(['dev'])
        })
    })

    describe('F10 routes: content without a version', () => {
        const routed = {
            lines: ['main', 'dev'],
            phases: PHASES,
            routes: {
                hotfix: { from: 'main', into: ['dev'], direction: 'down' },
                wrongway: { from: 'main', into: ['dev'], direction: 'up' },
            },
        }

        it('carries the branch and cuts no tag', async () => {
            // A fix that landed on the release line, as a hotfix does.
            git('checkout', '-q', 'main')
            commit('fix: an urgent repair')
            const tagsBefore = git('tag', '-l').trim()
            const f = new FlowController(cfg(routed), root)
            const done = await f.syncRoute('hotfix')
            expect(Object.keys(done.merged)).toEqual(['dev'])
            expect(git('rev-list', '--count', 'dev..main').trim()).toBe('0')
            expect(git('tag', '-l').trim()).toBe(tagsBefore)   // no version was minted
        })

        it('skips a target that already carries it, rather than making an empty merge', async () => {
            git('checkout', '-q', 'main')
            commit('fix: an urgent repair')
            const f = new FlowController(cfg(routed), root)
            await f.syncRoute('hotfix')
            const second = await f.syncRoute('hotfix')
            expect(second.merged).toEqual({})
            expect(second.skipped).toEqual(['dev'])
        })

        it('refuses a direction that contradicts the declared ladder', async () => {
            const f = new FlowController(cfg(routed), root)
            // main -> dev is DOWN on [main > dev]; a route claiming `up` would
            // merge the integration line into the release line.
            expect(() => f.route('wrongway')).toThrow(/declares direction 'up'.*is 'down'/s)
        })

        it('refuses an unknown route, naming the declared ones', () => {
            const f = new FlowController(cfg(routed), root)
            expect(() => f.route('nope')).toThrow(/Unknown route 'nope'.*hotfix/s)
        })

        it('a route with no targets is refused', () => {
            const f = new FlowController(cfg({ phases: PHASES, routes: { x: { from: 'main', into: [] } } }), root)
            expect(() => f.route('x')).toThrow(/non-empty 'into'/)
        })

        it('a branch off the ladder is not direction-checked — topic branches are not lines', async () => {
            git('checkout', '-q', '-b', 'hotfix/urgent', 'main')
            commit('fix: urgent')
            const f = new FlowController(cfg({
                lines: ['main', 'dev'], phases: PHASES,
                routes: { up: { from: 'hotfix/urgent', into: ['main', 'dev'], direction: 'up' } },
            }), root)
            const done = await f.syncRoute('up')
            expect(Object.keys(done.merged).sort()).toEqual(['dev', 'main'])
        })
    })

    describe('F11 who holds the target decides where the merge happens', () => {
        const wt = { worktree: { enabled: true, dir: '.grm/wt' }, phases: PHASES }

        it('a target checked out HERE is merged in place, not by moving its ref', async () => {
            // Moving a checked-out branch's ref leaves that working tree and index
            // matching the OLD commit — every difference shows up as a local
            // modification in a checkout nobody was looking at.
            commit('feat: a capability')
            git('checkout', '-q', 'main')                 // the TARGET is held here
            const f = new FlowController(cfg(wt), root)
            const done = await f.run('prod')
            expect(done.tagged).toBe('v1.1.0')
            expect(git('rev-parse', 'main').trim()).toBe(done.mergeCommit)
            // The proof: the working tree still matches HEAD.
            expect(git('status', '--porcelain').trim()).toBe('')
            // …and no worktree was used for it.
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(false)
        })

        it('a target held in ANOTHER worktree is refused by name', async () => {
            commit('feat: a capability')
            const other = join(root, 'elsewhere')
            git('worktree', 'add', other, 'main')          // main is held over there
            git('checkout', '-q', 'dev')
            const before = git('rev-parse', 'main').trim()
            const f = new FlowController(cfg(wt), root)
            await expect(f.run('prod')).rejects.toThrow(/checked out in another worktree/)
            // Nothing moved. (`dev..main` is 0 in this fixture BY CONSTRUCTION —
            // dev was branched from main — so it cannot be the evidence; the
            // target's own sha is.)
            expect(git('rev-parse', 'main').trim()).toBe(before)
            expect(git('tag', '-l').trim()).toBe('v1.0.0')
        })
    })

    describe('F8 the worktree path', () => {
        const wtFlow = { worktree: { enabled: true, dir: '.grm/wt' }, phases: PHASES }

        it('moves the branch even though the merge lands detached', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            const before = git('rev-parse', 'main').trim()
            const f = new FlowController(cfg(wtFlow), root)
            const done = await f.run('prod')
            expect(git('rev-parse', 'main').trim()).toBe(done.mergeCommit)
            expect(git('rev-parse', 'main').trim()).not.toBe(before)
        })

        it('leaves nothing behind', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            await new FlowController(cfg(wtFlow), root).run('prod')
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(false)
            expect(git('worktree', 'list').trim().split('\n').length).toBe(1)
        })

        it('keep: true leaves it for inspection', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            const f = new FlowController(
                cfg({ worktree: { enabled: true, dir: '.grm/wt', keep: true }, phases: PHASES }), root)
            await f.run('prod')
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(true)
        })

        it('refuses a worktree directory it does not own', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            // A directory that merely LOOKS like ours may hold in-flight work.
            execFileSync('mkdir', ['-p', join(root, '.grm/wt/flow-prod')])
            const f = new FlowController(cfg(wtFlow), root)
            await expect(f.run('prod')).rejects.toThrow(/owner marker/)
        })

        it('…and the refused directory SURVIVES the refusal', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            const foreign = join(root, '.grm/wt/flow-prod')
            execFileSync('mkdir', ['-p', foreign])
            writeFileSync(join(foreign, 'someones-work.txt'), 'do not delete me\n')
            const f = new FlowController(cfg(wtFlow), root)
            await expect(f.run('prod')).rejects.toThrow(/owner marker/)
            // The cleanup used to reach it: one variable served both "where I
            // would work" and "what I created", so the finally deleted exactly
            // what the refusal had just protected.
            expect(existsSync(join(foreign, 'someones-work.txt'))).toBe(true)
        })

        it('reclaims a leftover from a killed run instead of piling them up', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            // What a SIGKILL leaves: a registered worktree with our marker and no
            // finally to remove it.
            const stale = join(root, '.grm/wt/flow-prod')
            git('worktree', 'add', '--detach', stale, 'main')
            execFileSync('mkdir', ['-p', join(stale, '.grm-flow')])
            writeFileSync(join(stale, '.grm-flow', 'owner'), 'FlowController/v1\n')
            expect(git('worktree', 'list').trim().split('\n').length).toBe(2)

            const f = new FlowController(cfg(wtFlow), root)
            const done = await f.run('prod')
            expect(done.tagged).toBe('v1.1.0')
            expect(git('worktree', 'list').trim().split('\n').length).toBe(1)
            expect(existsSync(stale)).toBe(false)
        })

        it('a kept worktree is reclaimed by the NEXT run, not hoarded', async () => {
            commit('feat: a capability')
            // Stay on dev: the target must be FREE for the isolated path to be
            // taken at all, and that is the real shape — you promote dev into main
            // from dev. With main checked out here the merge has to happen in this
            // checkout, because moving a checked-out branch's ref desyncs it.
            const kept = { worktree: { enabled: true, dir: '.grm/wt', keep: true }, phases: PHASES }
            await new FlowController(cfg(kept), root).run('prod')
            expect(existsSync(join(root, '.grm/wt/flow-prod'))).toBe(true)

            // A second promotion: `keep` is for inspecting the run that happened,
            // not a licence to leave a full checkout per release behind.
            git('checkout', '-q', 'dev')
            git('merge', '-q', '--no-edit', 'main')
            commit('feat: more')
            git('checkout', '-q', 'main')
            await new FlowController(cfg(kept), root).run('prod')
            expect(git('worktree', 'list').trim().split('\n').length).toBe(2)   // only the new one
        })
    })
})
