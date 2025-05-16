import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch switch operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/switch')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, { withGit: true })
        git = simpleGit(PROJECT_DIR)

        // Create an initial commit and two branches for switching
        fs.writeFileSync(join(PROJECT_DIR, 'initial.txt'), 'Initial content')
        await git.add('.')
        await git.commit('Initial commit')
        await git.checkoutLocalBranch('feature-branch')
        fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'Feature content')
        await git.add('.')
        await git.commit('Feature branch commit')
        await git.checkoutLocalBranch('main') // Switch back to main to test the switch later
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Switch to an existing branch', async () => {
        // Ensure we're starting from 'main'
        let currentBranch = await git.revparse(['--abbrev-ref', 'HEAD'])
        expect(currentBranch).toBe('main')

        // Execute the switch command to move to the 'feature-branch'
        execSync(`grm branch switch feature-branch`, { cwd: PROJECT_DIR })

        // Verify the current branch is now 'feature-branch'
        currentBranch = await git.revparse(['--abbrev-ref', 'HEAD'])
        expect(currentBranch).toBe('feature-branch')
    })
})
