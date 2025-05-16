import { execSync } from 'child_process'
import { join } from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch switch error handling', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/switch')
    const PROJECT_DIR = join(E2E_DIR, 'test-project-error')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, { withGit: true })
        git = simpleGit(PROJECT_DIR)

        // Initial commit and branch setup
        await git.checkoutLocalBranch('main')
        await git.add('.')
        await git.commit('Initial commit')
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Error when branch name is not provided for switch', () => {
        try {
            // Attempt to switch a branch without specifying a name
            execSync(`grm branch switch`, {
                cwd: PROJECT_DIR,
                stdio: 'pipe', // captures output to read stderr
            })
            fail('Command should have failed due to missing branch name')
        } catch (error: any) {
            // Extract error message from stderr
            const errorMessage = error.stderr.toString()
            expect(errorMessage).toContain("error: missing required argument 'name'")
        }

        // Ensure no branch switch occurred erroneously
        return git.revparse(['--abbrev-ref', 'HEAD']).then(currentBranch => {
            // Verify that the current branch is still 'main'
            expect(currentBranch).toBe('main')
        })
    })
})
