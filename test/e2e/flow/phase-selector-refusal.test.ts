import { execSync } from 'child_process'
import { join } from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createEmptyTestWorkspace } from '../projectSetup'

// A phase command with no selector used to print a lone `v` and exit 0 — a
// string that is not a version under any reading, handed to the caller as if it
// were one.
//
// This suite exists because the repair removed its own witness: every bare call
// in the e2e suite was given `--next`, so nothing would have exercised the
// refusal and it could have rotted green. Each case asserts the exit code AND
// that the message names the selectors THIS phase accepts, since that list
// differs per phase and a message offering a rejected option is worse than none.
describe('E2E: flow phase refuses when nothing is selected', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/flow/selector-refusal')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        await createEmptyTestWorkspace(PROJECT_DIR, { withGit: true })
        git = simpleGit(PROJECT_DIR)
        await git.checkoutLocalBranch('dev')
    })

    afterAll(async () => {
        await cleanupTestProject(PROJECT_DIR)
    })

    const run = (args: string): { status: number; stderr: string; stdout: string } => {
        try {
            const stdout = execSync(`grm flow phase ${args} 2>/dev/null`, { cwd: PROJECT_DIR, encoding: 'utf8' })
            return { status: 0, stderr: '', stdout }
        } catch (error: any) {
            return { status: error.status, stderr: String(error.stderr ?? ''), stdout: String(error.stdout ?? '') }
        }
    }

    const stderrOf = (args: string): string => {
        try {
            execSync(`grm flow phase ${args} 2>&1 1>/dev/null`, { cwd: PROJECT_DIR, encoding: 'utf8' })
            return ''
        } catch (error: any) {
            return String(error.stdout ?? '') + String(error.stderr ?? '')
        }
    }

    test.each([
        { phase: 'dev', offers: ['--next', '--current'], withholds: ['--next-fix', '--previous'] },
        { phase: 'qa alpha', offers: ['--next', '--next-release', '--current'], withholds: ['--next-fix'] },
        { phase: 'prod', offers: ['--next', '--next-fix', '--previous-fix'], withholds: [] },
    ])('$phase refuses, and names only the selectors it accepts', ({ phase, offers, withholds }) => {
        const result = run(phase)
        expect(result.status).not.toBe(0)

        const message = stderrOf(phase)
        for (const offer of offers) {
            expect(message).toContain(offer)
        }
        // dev has no --next-fix; offering one would send the caller into a
        // second error.
        for (const withheld of withholds) {
            expect(message).not.toContain(withheld)
        }
    })

    test('the lone prefix is gone — nothing is printed on stdout when it refuses', () => {
        const result = run('dev')
        expect(result.stdout.trim()).toBe('')
    })

    // Positive control. Without it a broken binary — or a wrong cwd — would make
    // every case above pass for the wrong reason.
    test('…and a selector still answers', () => {
        const answer = execSync('grm flow phase dev --next', { cwd: PROJECT_DIR, encoding: 'utf8' }).trim()
        expect(answer).toMatch(/^v\d+\.\d+\.\d+-dev\.\d+$/)
    })
})
