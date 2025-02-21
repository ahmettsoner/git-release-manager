import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { createTestProject } from '../projectSetup'

describe('E2E: Version validate operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/validate/happy')
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

    test('Validate a correct version string', () => {
        const version = "1.0.0"
        const validVersionOutput = execSync(`grm version --validate ${version}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        expect(validVersionOutput).toContain(`Version ${version} is valid`)
    })
})