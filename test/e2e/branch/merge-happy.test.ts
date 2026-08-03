import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch merge operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/merge')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    const REMOTE_DIR = join(E2E_DIR, 'remote-repo') // Remote repo path
    let git: SimpleGit
    const baseBranch = 'main'

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, { withGit: true })

        // Remote setup
        await fs.promises.mkdir(REMOTE_DIR, { recursive: true })
        simpleGit().cwd(REMOTE_DIR).init(true, ['--bare'])

        git = simpleGit(PROJECT_DIR)
        await git.addRemote('origin', REMOTE_DIR)

        // Initialize with a commit on main
        await git.checkoutLocalBranch('main')
        fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Initial content')
        await git.add('.')
        await git.commit('Initial commit on main')
        await git.push(['-u', 'origin', 'main'])
    })

    afterAll(async () => {
        // Own directories only — never the shared E2E_DIR. merge-happy and
        // merge-error both live under .../branch/merge, jest runs them in
        // parallel workers, and whichever finished first used to delete the
        // other's working directory mid-run (`spawn git ENOENT`). The victim
        // varied by run, which is what a race looks like from the report.
        await cleanupTestProject(PROJECT_DIR)
        // The bare remote is state too: left behind it already carries `main`,
        // and the next run's push would be rejected as non-fast-forward.
        await cleanupTestProject(REMOTE_DIR)
    })

    test('Merge a local branch into the current branch', async () => {
        const branchToMerge = 'feature-branch'

        // Create and checkout a new branch, add commit
        await git.checkoutLocalBranch(branchToMerge)
        fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'Feature branch content')
        await git.add('.')
        await git.commit('Commit on feature branch')

        // Switch back to main
        await git.checkout(baseBranch)

        // Merge the feature branch
        execSync(`grm branch merge ${branchToMerge}`, { cwd: PROJECT_DIR })

        // Verify the merge.
        //
        // `grm branch merge` passes --no-ff on purpose (BranchManager.ts), so
        // HEAD is the MERGE commit and not the branch tip — this assertion used
        // to demand the tip and pinned fast-forward semantics the product
        // deliberately does not have.
        const log = await git.log()
        expect(log.latest?.message).toContain(`Merge branch '${branchToMerge}'`)

        // The feature commit must have actually been brought in ...
        expect(log.all.map(entry => entry.message)).toContain('Commit on feature branch')

        // ... via a real two-parent merge commit. This is the load-bearing
        // check, and it is why the message assertion is not left to carry the
        // claim alone: a message check passes on any commit somebody merely
        // NAMED "Merge branch …", and a reachability check passes on a
        // fast-forward. Only the parent count rules out both at once.
        const parents = (await git.raw(['rev-list', '--parents', '-n', '1', 'HEAD'])).trim().split(/\s+/)
        expect(parents).toHaveLength(3)

        // ... and the content landed on the base branch.
        expect(fs.readFileSync(join(PROJECT_DIR, 'feature.txt'), 'utf8')).toBe('Feature branch content')
    })

    test('Merge a branch using remote/branch syntax into the current branch', async () => {
        const branchToMerge = 'syntax-feature-branch'

        // Create and checkout a new branch, add commit, and push
        await git.checkoutLocalBranch(branchToMerge)
        fs.writeFileSync(join(PROJECT_DIR, 'syntax-feature.txt'), 'Syntax feature branch content')
        await git.add('.')
        await git.commit('Commit on syntax feature branch')
        await git.push(['-u', 'origin', branchToMerge])

        // Switch back to main
        await git.checkout(baseBranch)

        // Fetch changes from the remote
        await git.fetch()

        // Merge using origin/branch syntax by specifying the full remote branch path
        execSync(`grm branch merge origin/${branchToMerge}`, { cwd: PROJECT_DIR })

        // Verify the merge — --no-ff again, and git names a remote-tracking
        // merge differently from a local one. Same three-legged shape as above:
        // message, reachability, and the parent count that rules out a
        // fast-forward.
        const log = await git.log()
        expect(log.latest?.message).toContain(`Merge remote-tracking branch 'origin/${branchToMerge}'`)
        expect(log.all.map(entry => entry.message)).toContain('Commit on syntax feature branch')

        const parents = (await git.raw(['rev-list', '--parents', '-n', '1', 'HEAD'])).trim().split(/\s+/)
        expect(parents).toHaveLength(3)

        expect(fs.readFileSync(join(PROJECT_DIR, 'syntax-feature.txt'), 'utf8')).toBe(
            'Syntax feature branch content'
        )
    })

    test('Squash merge a local branch into the current branch', async () => {
        const branchToSquashMerge = 'feature-squash-branch'

        // Create and checkout a new branch, add multiple commits
        await git.checkoutLocalBranch(branchToSquashMerge)
        fs.writeFileSync(join(PROJECT_DIR, 'feature-1.txt'), 'Feature 1 content')
        await git.add('.')
        await git.commit('First commit on feature squash branch')

        fs.writeFileSync(join(PROJECT_DIR, 'feature-2.txt'), 'Feature 2 content')
        await git.add('.')
        await git.commit('Second commit on feature squash branch')

        // Switch back to main
        await git.checkout(baseBranch)

        // Squash merge the branch
        execSync(`grm branch merge ${branchToSquashMerge} --squash`, { cwd: PROJECT_DIR })

        // Verify the squash merge
        const log = await git.log()
        expect(log.latest?.message).toBe(`Squashed merge of '${branchToSquashMerge}' into '${baseBranch}'`)

        // Ensure that only one new commit was added to the main branch
        const commitCount = log.all.filter(commit => commit.message.includes('Squashed merge')).length
        expect(commitCount).toBe(1)

        // Ensure the specific changes (content) are present in the current branch
        const finalContent1 = fs.readFileSync(join(PROJECT_DIR, 'feature-1.txt'), 'utf8')
        const finalContent2 = fs.readFileSync(join(PROJECT_DIR, 'feature-2.txt'), 'utf8')
        expect(finalContent1).toBe('Feature 1 content')
        expect(finalContent2).toBe('Feature 2 content')
    })
})
