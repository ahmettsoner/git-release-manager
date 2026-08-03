import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch release operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/release')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: false,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)

        // Prepare a branch to release
        await git.checkoutLocalBranch('feature-branch')
        fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'New feature content\n')
        await git.add('.')
        await git.commit('Add new feature')
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Release a branch', async () => {
        const releaseVersion = '1.0.0'
        const releaseBranch = `release/${releaseVersion}`

        // Use the CLI command to cut a release branch — typed subcommand, not
        // the commented-out `branch --release` flag.
        execSync(`grm branch create release ${releaseVersion}`, { cwd: PROJECT_DIR })

        // Verify that the release branch was created.
        //
        // This assertion used to name `feature-branch` — the branch beforeAll
        // had ALREADY created — with a comment claiming it matched the naming
        // pattern. It did not: the command produces `release/<version>`, and
        // asserting the pre-existing branch made the test pass even if the
        // command did nothing at all.
        const branches = await git.branchLocal()
        expect(branches.all).toContain(releaseBranch)

        // …and the cut carries the work it was cut from
        expect(await git.revparse(['--abbrev-ref', 'HEAD'])).toBe(releaseBranch)
        const content = fs.readFileSync(join(PROJECT_DIR, 'feature.txt'), 'utf8')
        expect(content).toContain('New feature content')
    })
})
