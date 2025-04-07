import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version compare operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/compare')
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

    test('Compare versions', async () => {
        // Initialize with some versions
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })
        execSync('grm version --major', { cwd: PROJECT_DIR }) // 2.0.0
        execSync('grm version --minor', { cwd: PROJECT_DIR }) // 2.1.0
        execSync('grm version --patch', { cwd: PROJECT_DIR }) // 2.1.1

        // Compare a past version with the latest
        const compareOutput = execSync('grm version --compare 2.0.0', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // Verify the output contains the comparison results
        expect(compareOutput).toContain('Comparing 2.0.0 with 2.1.1')
        expect(compareOutput).toContain('2.0.0 is behind 2.1.1') // Düzeltilmiş kısım
        expect(compareOutput).toContain('\nChanges:')

        // Optionally check some specific change details
        // expect(compareOutput).toContain('specific change detail if applicable');
    })
})
