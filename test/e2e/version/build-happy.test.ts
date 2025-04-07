import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version with build metadata', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/build')
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

    test('Build metadata without existing version', async () => {
        const expectedVersion = '0.0.0+001'

        const versionOutput = execSync('grm version --build 001', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Build metadata with major increment', async () => {
        // Initialize with 1.0.0
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })

        const expectedVersion = '2.0.0+build42'

        const versionOutput = execSync('grm version --major --build build42', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Build metadata with prefix', async () => {
        const prefix = 'v'
        const expectedVersion = 'v0.0.0+abc'

        const versionOutput = execSync(`grm version --build abc --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${expectedVersion}`)
    })

    test('Sequential build increments', async () => {
        const expectedVersion1 = '0.0.0+beta1'
        const expectedVersion2 = '0.0.0+beta2'

        execSync('grm version --init 0.0.0', { cwd: PROJECT_DIR })

        let versionOutput = execSync('grm version --build beta1', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion1} created successfully`)

        versionOutput = execSync('grm version --build beta2', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${expectedVersion2} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion1)
        expect(tags.all).toContain(expectedVersion2)
    })
})
