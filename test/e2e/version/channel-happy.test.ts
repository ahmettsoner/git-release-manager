import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { createTestProject } from '../projectSetup'

describe('E2E: Version with channel flag', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/channel')
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

    test('Channel with no version, should start from 0.0.0-alpha.0', async () => {
        const expectedVersion = '0.0.0-alpha.1'

        const versionOutput = execSync('grm version --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Channel with major increment', async () => {
        // Initialize with 1.0.0
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })

        const expectedVersion = '2.0.0-alpha.1'
        
        const versionOutput = execSync('grm version --major --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Channel with prefix', async () => {
        const prefix = 'v'
        const expectedVersion = '0.0.0-alpha.1'

        const versionOutput = execSync(`grm version --channel alpha --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${prefix}${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${expectedVersion}`)
    })

    test('Channel with no-channel-number', async () => {
        const expectedVersion = '0.0.0-alpha'

        const versionOutput = execSync('grm version --channel alpha --no-channel-number', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Combined major increment, channel, prefix, and no-channel-number', async () => {
        const prefix = 'v'
        execSync(`grm version --init 1.0.0 --prefix ${prefix}`, { cwd: PROJECT_DIR })

        const expectedVersion = '2.0.0-alpha'

        const versionOutput = execSync(`grm version --major --channel alpha --prefix ${prefix} --no-channel-number`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${prefix}${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${expectedVersion}`)
    })

    test('Channel with minor increment', async () => {
        // Initialize with 1.1.0
        execSync('grm version --init 1.1.0', { cwd: PROJECT_DIR })

        const expectedVersion = '1.2.0-alpha.1'

        const versionOutput = execSync('grm version --minor --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Channel with patch increment', async () => {
        // Initialize with 1.1.1
        execSync('grm version --init 1.1.1', { cwd: PROJECT_DIR })

        const expectedVersion = '1.1.2-alpha.1'

        const versionOutput = execSync('grm version --patch --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Sequential channel versioning', async () => {
        const expectedVersion1 = '0.0.0-alpha.1'
        const expectedVersion2 = '0.0.0-alpha.2'

        execSync('grm version --init 0.0.0', { cwd: PROJECT_DIR })

        let versionOutput = execSync('grm version --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion1} created successfully`)

        versionOutput = execSync('grm version --channel alpha', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion2} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion1)
        expect(tags.all).toContain(expectedVersion2)
    })
})