import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version validate operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/validate/error')
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

    test('Validate an incorrect version string', () => {
        const version = '1.0'
        expect(() => {
            execSync(`grm version --validate ${version}`, {
                cwd: PROJECT_DIR,
                encoding: 'utf8',
            })
        }).toThrow(`Invalid version format: ${version}`)
    })
})
