import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch create operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/create')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: false,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Create a new branch', async () => {
        // Create a new branch using the CLI command
        const branchName = 'new-feature-branch'
        execSync(`grm branch --create ${branchName}`, { cwd: PROJECT_DIR })

        // Fetch the list of branches to verify the new branch was created
        const branches = await git.branchLocal()

        // Verify that the new branch was created
        expect(branches.all).toContain(branchName)
    })
})
