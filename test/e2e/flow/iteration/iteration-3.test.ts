import { execSync } from 'child_process'
import { join } from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createEmptyTestWorkspace } from '../../projectSetup'

// With first test release (alpha)
describe('E2E: Iteration Scenario Iteration 3', () => {
    const E2E_DIR = join(__dirname, '../../../../temp/test/e2e/scenario/iteration-3')
    let git: SimpleGit

    const setupTest = async(project_dir:string) => {
        await createEmptyTestWorkspace(project_dir, {
            withGit: true,
            withNpm: true,
            withGitHub: true
        });
        git = simpleGit(project_dir)
    }


    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })


    test('First Beta Tag', async () => {
        const PROJECT_DIR = join(E2E_DIR, `first-beta-tag`);
        await setupTest(PROJECT_DIR)

        await git.checkoutLocalBranch("release/v1.0.0-alpha")
        await git.addTag('v1.0.0-alpha.1')
        await git.checkoutLocalBranch("release/v1.0.0-beta")

        const expectedVersion = 'v1.0.0-beta.1'

        const versionOutput = execSync('grm flow phase stage beta v1.0.0', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        }).trim()
        expect(versionOutput).toEqual(expectedVersion)
    })

    test('Second Beta Tag', async () => {
        const PROJECT_DIR = join(E2E_DIR, `second-beta-tag`);
        await setupTest(PROJECT_DIR)

        await git.checkoutLocalBranch("release/v1.0.0-alpha")
        await git.addTag('v1.0.0-alpha.1')
        await git.checkoutLocalBranch("release/v1.0.0-beta")
        await git.addTag('v1.0.0-beta.1')

        const expectedVersion = 'v1.0.0-beta.2'

        const versionOutput = execSync('grm flow phase stage beta v1.0.0', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        }).trim()
        expect(versionOutput).toEqual(expectedVersion)
    })

    test('Third Beta Tag', async () => {
        const PROJECT_DIR = join(E2E_DIR, `third-beta-tag`);
        await setupTest(PROJECT_DIR)

        await git.checkoutLocalBranch("release/v1.0.0-alpha")
        await git.addTag('v1.0.0-alpha.1')
        await git.checkoutLocalBranch("release/v1.0.0-beta")
        await git.addTag('v1.0.0-beta.1')
        await git.addTag('v1.0.0-beta.2')

        const expectedVersion = 'v1.0.0-beta.3'

        const versionOutput = execSync('grm flow phase stage beta v1.0.0', {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        }).trim()
        expect(versionOutput).toEqual(expectedVersion)
    })
})