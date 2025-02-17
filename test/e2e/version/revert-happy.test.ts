import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { createTestProject } from '../projectSetup'

describe('E2E: Version revert operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/revert')
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


    test('Revert to a previous version', async () => {
        // Initialize with a few versions
        execSync('grm version --init 1.0.0', { cwd: PROJECT_DIR })
        execSync('grm version --major', { cwd: PROJECT_DIR }) // 2.0.0

        const revertOutput = execSync('grm version --revert 1.0.0', { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })
        
        expect(revertOutput).toContain('Reverted to version 1.0.0')
        
        const currentBranch = await git.raw(['rev-parse', 'HEAD'])
        const tagCommit = await git.raw(['rev-list', '-n', '1', 'tags/1.0.0'])
        expect(currentBranch.trim()).toBe(tagCommit.trim())
    })
})