import fs from 'fs'
import os from 'os'
import { join } from 'path'
import { matchFilesInDirectory, ProjectVersionManager } from '../../../src/modules/version/ProjectVersion'

// These cases exist because of a defect that was invisible from inside this
// repository: `detectProjectFile` reached its wildcard branch through
// `require('glob')`, and `glob` was never in `dependencies`. A development
// checkout resolves it transitively via devDependencies, so every test here
// passed; a packaged install ships `dependencies` only, so `grm version
// --detect` died there with "Cannot find module 'glob'".
//
// The seal therefore has to cover BOTH halves. Testing matchFilesInDirectory
// alone would leave the exact shape of the original defect untested — a working
// helper that the call site does not reach. The last describe() block drives
// the real public entry point instead.

describe('matchFilesInDirectory', () => {
    let dir: string

    beforeEach(() => {
        dir = fs.mkdtempSync(join(os.tmpdir(), 'grm-pattern-'))
    })

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true })
    })

    it('selects the files a single-star pattern names', () => {
        fs.writeFileSync(join(dir, 'App.csproj'), '')
        fs.writeFileSync(join(dir, 'README.md'), '')

        expect(matchFilesInDirectory('*.csproj', dir)).toEqual(['App.csproj'])
    })

    it('returns matches sorted, so the caller’s [0] does not depend on readdir order', () => {
        // THE ORDER IS FORCED, NOT HOPED FOR. The first version of this case
        // wrote Zeta.csproj then Alpha.csproj to a real directory and asserted
        // the sorted pair. Deleting `.sort()` from the implementation left it
        // GREEN -- measured -- because ext4 handed the names back already
        // alphabetical, so the case never exercised the line it named. An
        // assertion whose subject the filesystem chooses is not an assertion
        // about this function.
        //
        // readdirSync is therefore stubbed to return a KNOWN-unsorted listing.
        // It is the input ordering that is controlled and nothing else: the
        // entries are ordinary files, and the assertion is on the real output.
        const entry = (name: string) => ({
            name,
            isFile: () => true,
            isSymbolicLink: () => false,
        })
        const spy = jest
            .spyOn(fs, 'readdirSync')
            .mockReturnValue([entry('Zeta.csproj'), entry('Alpha.csproj')] as never)

        try {
            expect(matchFilesInDirectory('*.csproj', dir)).toEqual(['Alpha.csproj', 'Zeta.csproj'])
        } finally {
            spy.mockRestore()
        }
    })

    it('does not let a leading star match a leading dot, as glob does not', () => {
        fs.writeFileSync(join(dir, '.csproj'), '')

        expect(matchFilesInDirectory('*.csproj', dir)).toEqual([])
    })

    it('does not select a directory whose name matches', () => {
        // The caller readFileSync()s whatever comes back, so a directory here
        // is not a near-miss, it is a crash one line later.
        fs.mkdirSync(join(dir, 'Bundle.csproj'))
        fs.writeFileSync(join(dir, 'Real.csproj'), '')

        expect(matchFilesInDirectory('*.csproj', dir)).toEqual(['Real.csproj'])
    })

    it('treats the non-star part as literal text, not as a regex', () => {
        fs.writeFileSync(join(dir, 'aXcsproj'), '')
        fs.writeFileSync(join(dir, 'a.csproj'), '')

        // An unescaped '.' would match the 'X' too.
        expect(matchFilesInDirectory('*.csproj', dir)).toEqual(['a.csproj'])
    })

    it('refuses a pattern it cannot serve instead of reporting no match', () => {
        // Silently returning [] would surface as "No supported project file
        // found in current directory" -- true-sounding, wrong subject.
        expect(() => matchFilesInDirectory('src/**/*.csproj', dir)).toThrow(
            /Unsupported project file pattern 'src\/\*\*\/\*\.csproj'/
        )
        expect(() => matchFilesInDirectory('v?.csproj', dir)).toThrow(/Unsupported project file pattern/)
    })

    it('reports no match for an unreadable directory rather than throwing', () => {
        expect(matchFilesInDirectory('*.csproj', join(dir, 'does-not-exist'))).toEqual([])
    })
})

describe('ProjectVersionManager wildcard detection (the call site)', () => {
    let dir: string
    let cwd: string

    beforeEach(() => {
        cwd = process.cwd()
        dir = fs.mkdtempSync(join(os.tmpdir(), 'grm-detect-'))
        process.chdir(dir)
    })

    afterEach(() => {
        process.chdir(cwd)
        fs.rmSync(dir, { recursive: true, force: true })
    })

    it('detects a .csproj version with no dependency beyond the standard library', () => {
        // No package.json / pyproject.toml / build.gradle / go.mod here, so the
        // table reaches its ONLY wildcard entry -- the branch that used to
        // require('glob') and that a packaged install could not execute.
        fs.writeFileSync(join(dir, 'App.csproj'), '<Project><Version>2.3.4</Version></Project>')

        expect(new ProjectVersionManager().getCurrentVersion()).toBe('2.3.4')
    })

    it('still prefers an earlier table entry over the wildcard one', () => {
        fs.writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '1.0.0' }))
        fs.writeFileSync(join(dir, 'App.csproj'), '<Project><Version>2.3.4</Version></Project>')

        expect(new ProjectVersionManager().getCurrentVersion()).toBe('1.0.0')
    })
})
