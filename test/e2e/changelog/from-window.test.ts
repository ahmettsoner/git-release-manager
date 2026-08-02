import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'

/**
 * `changelog --from <ref>` has to MOVE the window, not merely be accepted.
 *
 * from.happy.test.ts asserts only that commits it expects are present, which a
 * build that parses --from and then throws the value away satisfies just as
 * well as a correct one — measured: deleting the `options?.from` read in
 * modules/git/gitOperations.ts::resolveGitReferences leaves that whole file
 * green. This suite pins the discriminating fact instead: the reference handed
 * to --from is the EXCLUSIVE lower bound, so the commit it names must be absent
 * from the output while later commits remain.
 */
describe('E2E: Changelog --from moves the range window', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/changelog-from-window')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit
    let bravoHash: string

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: false,
        })
        git = simpleGit(PROJECT_DIR)
        await git.addConfig('remote.origin.url', 'https://github.com/test-user/test-repo.git')

        fs.writeFileSync(join(PROJECT_DIR, 'f.txt'), 'a\n')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "feat: alpha commit"', { cwd: PROJECT_DIR })

        fs.appendFileSync(join(PROJECT_DIR, 'f.txt'), 'b\n')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "fix: bravo commit"', { cwd: PROJECT_DIR })

        fs.appendFileSync(join(PROJECT_DIR, 'f.txt'), 'c\n')
        execSync('git add .', { cwd: PROJECT_DIR })
        execSync('git commit -m "chore: charlie commit"', { cwd: PROJECT_DIR })

        execSync('git tag -a v1.0.0 -m v1.0.0', { cwd: PROJECT_DIR })

        bravoHash = execSync('git log --format=%H --grep=bravo', { cwd: PROJECT_DIR, encoding: 'utf8' }).trim()
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Without --from the whole history is in range', () => {
        const output = execSync('grm changelog', { cwd: PROJECT_DIR, encoding: 'utf8' })

        expect(output).toContain('bravo commit')
        expect(output).toContain('charlie commit')
    })

    test('--from <ref> excludes that ref and everything before it', () => {
        const output = execSync(`grm changelog --from ${bravoHash}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8',
        })

        // The commit named by --from is the lower bound and is itself excluded.
        expect(output).not.toContain('bravo commit')
        // Everything after it is still rendered, so this is a moved window and
        // not simply an empty result.
        expect(output).toContain('charlie commit')
    })
})
