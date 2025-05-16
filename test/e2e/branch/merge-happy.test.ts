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
        await cleanupTestProject(E2E_DIR)
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

        // Verify the merge
        const log = await git.log()
        expect(log.latest?.message).toBe('Commit on feature branch')
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

        // Verify the merge
        const log = await git.log()
        expect(log.latest?.message).toBe('Commit on syntax feature branch')
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
