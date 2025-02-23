import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

describe('E2E: Changelog command with --from flag', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/changelog')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)
        await git.addConfig('remote.origin.url', 'https://github.com/test-user/test-repo.git')
    })

    beforeEach(async () => {
        fs.mkdirSync(PROJECT_DIR, { recursive: true })

        // Initial setup with some commits
        fs.writeFileSync(join(PROJECT_DIR, 'README.md'), '# Test Project\nInitial content')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "feat: initial commit"', { cwd: PROJECT_DIR })

        // Another commit to give a starting point for the changelog
        fs.appendFileSync(join(PROJECT_DIR, 'README.md'), '\nAdded more content')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "fix: add more content to README.md"', { cwd: PROJECT_DIR })
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Generate changelog with no tag', async () => {
        const commitLog = await git.log()
        const initialCommitHash = commitLog.all[commitLog.all.length - 1].hash

        const changelogOutput = execSync(`grm changelog --from ${initialCommitHash}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        expect(changelogOutput).toContain('No tag found')
    })

    test('Generate changelog from first commit', async () => {
        const commitLog = await git.log()
        const initialCommitHash = commitLog.all[commitLog.all.length - 1].hash

        execSync(`grm version --init`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        fs.appendFileSync(join(PROJECT_DIR, 'CHANGELOG.md'), '\nInitial changelog entry')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "chore: update changelog"', { cwd: PROJECT_DIR })

        execSync(`grm version --patch`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        const changelogOutput = execSync(`grm changelog --from ${initialCommitHash}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        expect(changelogOutput).toContain('initial commit')
        expect(changelogOutput).toContain('add more content to README.md')
        expect(changelogOutput).toContain('update changelog')
    })

    // test('Generate changelog from specific tag', async () => {
    //     await git.checkout('v1.0.0');

    //     const changelogOutput = execSync(`grm changelog --from v1.0.0`, {
    //         cwd: PROJECT_DIR,
    //         encoding: 'utf8'
    //     });

    //     expect(changelogOutput).toContain('update changelog');
    //     expect(changelogOutput).not.toContain('initial commit');
    // });

    // test('Generate changelog for invalid --from reference', async () => {
    //     expect(() => {
    //         execSync(`grm changelog --from invalidReference`, {
    //             cwd: PROJECT_DIR,
    //             encoding: 'utf8'
    //         });
    //     }).toThrow('Unable to resolve git references');
    // });

    test('Fail to initialize version on repo with tags', async () => {
        expect(() => {
            execSync('grm version --init', {
                cwd: PROJECT_DIR,
                encoding: 'utf8',
            })
        }).toThrow('Repository already has tags. Use --reset if needed.')
    })

    // test('Complete range command (version gaps)', async () => {
    //     fs.appendFileSync(join(PROJECT_DIR, 'README.md'), '\nAnother update');
    //     execSync('git add .', { cwd: PROJECT_DIR });
    //     execSync('git commit -m "docs: update documentation"', { cwd: PROJECT_DIR });
    //     await git.tag(['v1.2.0']);

    //     const changelogOutput = execSync(`grm changelog --from v1.0.0`, {
    //         cwd: PROJECT_DIR,
    //         encoding: 'utf8'
    //     });

    //     expect(changelogOutput).toContain('update changelog');
    //     expect(changelogOutput).toContain('update documentation');
    //     expect(changelogOutput).not.toContain('initial commit');
    // });
})
