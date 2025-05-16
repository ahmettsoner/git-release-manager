import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Branch sync operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/sync')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true,
        })

        git = simpleGit(PROJECT_DIR)

        // Initial setup: create and push the 'main' branch to a remote
        await git.checkoutLocalBranch('main')
        fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Initial content\n')
        await git.add('.')
        await git.commit('Initial commit')
        execSync('git init --bare ../remote-repo.git', { cwd: PROJECT_DIR })
        await git.addRemote('origin', '../remote-repo.git')
        await git.push('origin', 'main')
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Sync branch with remote', async () => {
        // Make a new commit locally
        fs.appendFileSync(join(PROJECT_DIR, 'file.txt'), 'Local edit\n')
        await git.add('.')
        await git.commit('Local commit on main')

        // Use the CLI command to sync the branch
        execSync('grm branch --sync', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // Verify that the local branch is synced with the remote branch
        const log = await git.log()
        const hasSyncedChanges = log.all.some(entry => entry.message.includes('Local commit on main'))

        expect(hasSyncedChanges).toBe(true)

        // Ensure the file contains the local changes
        const fileContent = fs.readFileSync(join(PROJECT_DIR, 'file.txt'), 'utf8')
        expect(fileContent).toContain('Local edit')
    })
})
