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
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: false,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)

        // Create branches for switching
        await git.checkoutLocalBranch('feature-branch')
        await git.checkoutLocalBranch('main') // Make sure to return to 'main' or 'master'
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Switch to an existing branch', async () => {
        const branchToSwitch = 'feature-branch'

        // Switch to the feature branch using the CLI command
        execSync(`grm branch --switch ${branchToSwitch}`, { cwd: PROJECT_DIR })

        // Verify the current branch is now the feature branch
        const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD'])
        expect(currentBranch.trim()).toBe(branchToSwitch)
    })
})
