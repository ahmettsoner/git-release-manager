import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import {createTestProject} from '../projectSetup'

describe('E2E: Version major happy path', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/major/happy')
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

    test('Major increment with no existing version should start from 0.0.0', async () => {
        const expectedVersion = '1.0.0'

        const versionOutput = execSync('grm version --major', { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Major increment with existing version', async () => {
        // Initialize with 1.2.3
        execSync('grm version --init 1.2.3', {
            cwd: PROJECT_DIR
        })

        const expectedVersion = '2.0.0'
        
        const versionOutput = execSync('grm version --major', { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(expectedVersion)
    })

    test('Major increment with prefix and no existing version', async () => {
        const prefix = 'v'
        const expectedVersion = '1.0.0'

        const versionOutput = execSync(`grm version --major --prefix ${prefix}`, { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${prefix}${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${expectedVersion}`)
    })

    test('Major increment with prefix and existing version', async () => {
        const prefix = 'v'
        // Initialize with v1.2.3
        execSync(`grm version --init 1.2.3 --prefix ${prefix}`, {
            cwd: PROJECT_DIR
        })

        const expectedVersion = '2.0.0'
        
        const versionOutput = execSync(`grm version --major --prefix ${prefix}`, { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        expect(versionOutput).toContain(`Version ${prefix}${expectedVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${expectedVersion}`)
    })
})