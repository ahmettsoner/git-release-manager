import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { createTestProject } from '../projectSetup'

describe('E2E: Version with prerelease flag', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/prerelease')
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

    beforeEach(async () => {
        const tags = await git.tags()
        for (const tag of tags.all) {
            await git.tag(['--delete', tag])
        }
    })

    afterAll(() => {
        fs.rmSync(E2E_DIR, { recursive: true, force: true })
    })

    test('Prerelease without existing version should default to 0.0.0-alpha.0', async () => {
        const expectedVersion = '0.0.0-alpha'

        const versionOutput = execSync('grm version --prerelease alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prerelease with major increment', async () => {
        // Initialize with 1.0.0
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })

        const expectedVersion = '2.0.0-beta'
        
        const versionOutput = execSync('grm version --major --prerelease beta', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prerelease with prefix', async () => {
        const prefix = 'v'
        const expectedVersion = '0.0.0-rc'

        const versionOutput = execSync(`grm version --prerelease rc --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${prefix}${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${expectedVersion}`)
    })

})