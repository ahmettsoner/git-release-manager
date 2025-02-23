import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch protect operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/protect')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: false,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)

        // Set up initial branches
        await git.checkoutLocalBranch('main')
        await git.commit('Initial commit on main', ['--allow-empty'])

        await git.checkoutLocalBranch('develop')
        await git.commit('Initial commit on develop', ['--allow-empty'])
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })
    test('Protect a branch', async () => {
        const branchToProtect = 'develop'

        // Use the CLI command to protect the branch
        execSync(`grm branch --protect ${branchToProtect}`, {
            cwd: PROJECT_DIR,
        })

        // Verify the branch is protected
        // Assuming protected branches are maintained in a config file or similar
        const config = await git.listConfig()
        const protectedBranches = config.all['branch.protected']

        // Check if protectedBranches is an array or string and handle accordingly
        let protectedBranchesList = []
        if (protectedBranches) {
            protectedBranchesList = Array.isArray(protectedBranches) ? protectedBranches : JSON.parse(protectedBranches)
        }

        expect(protectedBranchesList).toContain(branchToProtect)
    })

    test('Protect current branch', async () => {
        const branchToProtect = 'develop'

        await git.checkout('develop')

        execSync(`grm branch --protect`, {
            cwd: PROJECT_DIR,
        })

        // Verify the branch is protected
        // Assuming protected branches are maintained in a config file or similar
        const config = await git.listConfig()
        const protectedBranches = config.all['branch.protected']

        // Check if protectedBranches is an array or string and handle accordingly
        let protectedBranchesList = []
        if (protectedBranches) {
            protectedBranchesList = Array.isArray(protectedBranches) ? protectedBranches : JSON.parse(protectedBranches)
        }

        expect(protectedBranchesList).toContain(branchToProtect)
    })
})
