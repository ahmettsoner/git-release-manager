import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch list operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/list')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: false,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)

        // Create some branches to test listing functionality
        await git.checkoutLocalBranch('temporary-branch-1')
        await git.checkoutLocalBranch('main')
        await git.checkoutLocalBranch('temporary-branch-2')
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('List all branches', async () => {
        // List branches using the CLI command
        const listOutput = execSync(`grm branch --list`, { cwd: PROJECT_DIR, encoding: 'utf8' })

        // Retrieve branches directly using simple-git for verification
        const branches = await git.branchLocal()

        // Verify that all branch names are listed
        branches.all.forEach(branch => {
            expect(listOutput).toContain(branch)
        })
    })
})
