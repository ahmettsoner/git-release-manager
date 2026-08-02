import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

/**
 * A directory is the registry; `testMatch` is only an ordering over it.
 *
 * This repository shipped for months with `testMatch: ['**\/test\/**\/*.test.ts']`
 * while every file under `test/unit/` was `.js`. Twenty-four test files sat on
 * disk that jest never collected. The suite reported "48 suites, 130 passed, 0
 * failed" and that sentence was true — and said nothing at all about the 24. One
 * of them was holding a 100% CPU infinite loop in the shipped changelog path.
 *
 * A pattern cannot police itself. This gate asks two independent parties the
 * same question and requires the same answer:
 *
 *   party A — the filesystem: which files LOOK like tests?
 *   party B — jest itself (`--listTests`): which files does it COLLECT?
 *
 * Any file only party A knows about is a file that can rot in silence, so it is
 * a failure. The heuristic in LOOKS_LIKE_A_TEST is deliberately wider than
 * `testMatch`: it also matches `.spec.` and the `foo.test2.ts` form, which is
 * exactly how two live config tests hid here.
 *
 * Location independence: every path below is derived from `__dirname` and then
 * made repo-relative before comparison, and jest is resolved through
 * `require.resolve` rather than `PATH`. The verdict must not change because the
 * tree was checked out somewhere else.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const TEST_ROOT = path.join(REPO_ROOT, 'test')

// Wider than testMatch on purpose — see the note above.
const LOOKS_LIKE_A_TEST = /\.(test|spec)\d*\.[jt]sx?$/i

/**
 * Non-vacuity floor. Zero collected must never read as "green": if the discovery
 * walk below silently finds nothing (wrong root, broken regex, renamed tree),
 * both sides of the comparison go empty and the parity assertion passes while
 * measuring nothing. This floor makes that failure loud. Measured population at
 * the time of writing: 60 files on disk, 60 collected by jest.
 */
const NON_VACUITY_FLOOR = 55

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue
            walk(full, out)
        } else if (entry.isFile() && LOOKS_LIKE_A_TEST.test(entry.name)) {
            out.push(full)
        }
    }
    return out
}

function repoRelative(absolute: string): string {
    return path.relative(REPO_ROOT, absolute).split(path.sep).join('/')
}

function filesOnDisk(): string[] {
    return walk(TEST_ROOT).map(repoRelative).sort()
}

function suitesJestCollects(): string[] {
    // Ask jest, do not re-implement its matcher. `--listTests` resolves testMatch
    // through the very code path a real run uses, and does not execute anything.
    const jestBin = require.resolve('jest/bin/jest')
    const stdout = execFileSync(process.execPath, [jestBin, '--listTests'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
    })

    return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && path.isAbsolute(line))
        .map(repoRelative)
        .sort()
}

describe('test collection parity', () => {
    const onDisk = filesOnDisk()
    const collected = suitesJestCollects()

    it('discovers a non-empty population on both sides', () => {
        // The baseline that keeps "nothing found" from reading as "nothing wrong".
        expect(onDisk.length).toBeGreaterThanOrEqual(NON_VACUITY_FLOOR)
        expect(collected.length).toBeGreaterThanOrEqual(NON_VACUITY_FLOOR)
    })

    it('collects this very file, so the gate is inside the population it guards', () => {
        expect(collected).toContain('test/checks/collection-parity.test.ts')
    })

    it('leaves no test file on disk that jest does not collect', () => {
        const uncollected = onDisk.filter(f => !collected.includes(f))

        expect(uncollected).toEqual([])
    })

    it('collects nothing that is not on disk', () => {
        const phantom = collected.filter(f => !onDisk.includes(f))

        expect(phantom).toEqual([])
    })
})
