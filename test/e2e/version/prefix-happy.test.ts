import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version with prefix flag', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/prefix')
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
        const tags = await git.tags()
        for (const tag of tags.all) {
            await git.tag(['--delete', tag])
        }
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Prefix with init version', async () => {
        const prefix = 'v'
        const expectedVersion = 'v1.0.0'

        const versionOutput = execSync(`grm version --init 1.0.0 --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prefix with major increment', async () => {
        const prefix = 'v'
        execSync(`grm version --init 1.0.0 --prefix ${prefix}`, { cwd: PROJECT_DIR })

        const expectedVersion = 'v2.0.0'

        const versionOutput = execSync(`grm version --major --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prefix with minor increment', async () => {
        const prefix = 'v'
        execSync(`grm version --init 1.1.0 --prefix ${prefix}`, { cwd: PROJECT_DIR })

        const expectedVersion = 'v1.2.0'

        const versionOutput = execSync(`grm version --minor --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prefix with patch increment', async () => {
        const prefix = 'v'
        execSync(`grm version --init 1.1.1 --prefix ${prefix}`, { cwd: PROJECT_DIR })

        const expectedVersion = 'v1.1.2'

        const versionOutput = execSync(`grm version --patch --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Prefix with no existing version should start from 0.0.0', async () => {
        const prefix = 'v'
        const expectedVersion = 'v0.0.0'

        const versionOutput = execSync(`grm version --init --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })
})
