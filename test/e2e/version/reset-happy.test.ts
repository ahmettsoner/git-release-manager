import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version reset happy path', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/reset/happy')
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

    beforeEach(async () => {
        git.addTag('t1')
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Reset version tags', async () => {
        const versionOutput = execSync('grm version --reset', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain('All local tags deleted:')

        const tags = await git.tags()
        expect(tags.all).toHaveLength(0)
    })
})
