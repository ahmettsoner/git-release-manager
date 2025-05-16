import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version list operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/list')
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

    test('List versions', async () => {
        // Initialize with some versions
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })
        execSync('grm version --major', { cwd: PROJECT_DIR }) // 2.0.0
        execSync('grm version --minor', { cwd: PROJECT_DIR }) // 2.1.0
        execSync('grm version --patch', { cwd: PROJECT_DIR }) // 2.1.1

        // List the latest versions
        const listOutput = execSync('grm version --list 3', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // Verify the expected output
        const expectedTags = ['2.1.1', '2.1.0', '2.0.0']
        expectedTags.forEach(tag => {
            expect(listOutput).toContain(`Version: ${tag}`)
        })
    })
})
