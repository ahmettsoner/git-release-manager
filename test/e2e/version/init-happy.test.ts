import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version init happy path', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/init/happy')
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

    test('Init default version', async () => {
        const initialVersion = '0.0.0'

        const versionOutput = execSync('grm version --init', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${initialVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${initialVersion}`)
    })

    test('Init default version with prefix', async () => {
        const initialVersion = '0.0.0'
        const prefix = 'v'

        const versionOutput = execSync(`grm version --init --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${prefix}${initialVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${initialVersion}`)
    })

    test('Init custom version', async () => {
        const initialVersion = '1.0.0'

        const versionOutput = execSync(`grm version --init ${initialVersion}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${initialVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${initialVersion}`)
    })

    test('Init custom version with custom prefix', async () => {
        const initialVersion = '1.0.0'
        const prefix = 'v'

        const versionOutput = execSync(`grm version --init ${initialVersion} --prefix ${prefix}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })
        expect(versionOutput).toContain(`Version ${prefix}${initialVersion} created successfully`)

        const tags = await git.tags()
        expect(tags.all).toContain(`${prefix}${initialVersion}`)
    })
})
