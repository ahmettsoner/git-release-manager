import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version init error cases', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/init/error')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true,
        })
        const versionOutput = execSync('grm version --init', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`created successfully`)
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Should throw error when trying to init version with existing tags', async () => {
        expect(() => {
            execSync('grm version --init', {
                cwd: PROJECT_DIR,
                encoding: 'utf8',
            })
        }).toThrow('Repository already has tags. Use --reset if needed.')
    })
})
