import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { createTestProject } from '../projectSetup'

describe('E2E: Version latest operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/latest')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true
        })
        git = simpleGit(PROJECT_DIR)
    })

    afterEach(async () => {
        const tags = await git.tags()
        for (const tag of tags.all) {
            await git.tag(['--delete', tag])
        }
    })

    afterAll(() => {
        fs.rmSync(E2E_DIR, { recursive: true, force: true })
    })

    test('Show latest version', async () => {
        // Initialize with some versions
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })
        execSync('grm version --major', { cwd: PROJECT_DIR }) // 2.0.0
        execSync('grm version --minor', { cwd: PROJECT_DIR }) // 2.1.0
        execSync('grm version --patch', { cwd: PROJECT_DIR }) // 2.1.1

        // Get the latest version
        const latestOutput = execSync('grm version --latest', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        // Verify the expected latest version
        expect(latestOutput).toContain('Latest version: 2.1.1')
    })
})