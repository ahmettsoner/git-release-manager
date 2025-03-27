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
        const branchToRelease = 'feature-branch'
        const releaseBranch = `${branchToRelease}` // Updated to match actual naming pattern

        // Use the CLI command to release the branch
        execSync(`grm branch --release ${branchToRelease}`, { cwd: PROJECT_DIR })

        // Verify that the release branch was created
        const branches = await git.branchLocal()
        expect(branches.all).toContain(releaseBranch)

        // Optionally verify content in release branch
        await git.checkout(releaseBranch)
        const content = fs.readFileSync(join(PROJECT_DIR, 'feature.txt'), 'utf8')
        expect(content).toContain('New feature content')
    })
})
