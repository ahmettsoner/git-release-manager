import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Version increment combinations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/increment-combination')
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
        await cleanupTestProject(E2E_DIR);
    })

    test('Should handle minor after patch correctly', async () => {
        // Önce patch
        execSync('grm version --patch', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // Sonra minor
        const minorOutput = execSync('grm version --minor', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        expect(minorOutput).toContain('Version 0.1.0 created successfully')
    })

    test('Should handle patch after minor correctly', async () => {
        // Önce minor
        execSync('grm version --minor', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // Sonra patch
        const patchOutput = execSync('grm version --patch', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        expect(patchOutput).toContain('Version 0.1.1 created successfully')
    })

    test('Should maintain version history correctly', async () => {
        const versionSequence = [
            { command: '--patch', expectedVersion: '0.0.1' },
            { command: '--minor', expectedVersion: '0.1.0' },
            { command: '--patch', expectedVersion: '0.1.1' },
            { command: '--patch', expectedVersion: '0.1.2' },
            { command: '--minor', expectedVersion: '0.2.0' },
        ]

        for (const { command, expectedVersion } of versionSequence) {
            const output = execSync(`grm version ${command}`, {
                cwd: PROJECT_DIR,
                encoding: 'utf8',
            })

            expect(output).toContain(`Version ${expectedVersion} created successfully`)

            const tags = await git.tags()
            expect(tags.all).toContain(expectedVersion)
        }
    })
})
