import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version sync and operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/sync')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true,
        })
        git = simpleGit(PROJECT_DIR)
    })

    afterEach(async () => {
        const tags = await git.tags()
        for (const tag of tags.all) {
            await git.tag(['--delete', tag])
        }
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Sync without remote changes', async () => {
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })

        const syncOutput = execSync('grm version --sync', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        expect(syncOutput).toContain('Synced tags with remote')
        const tags = await git.tags()
        expect(tags.all).toContain('1.0.0')
    })
})
