module.exports = {
    preset: 'ts-jest',
    // These are e2e tests: every case shells out to the real `grm` binary, which
    // spawns node, which spawns git, repeatedly. At 10000 ms the suite reported
    // failures that were only scheduling — measured on one machine, `jest`
    // (parallel) failed 7 cases in branch/, version/build-happy and
    // version/detect-happy with "Exceeded timeout ... for a hook" that all
    // passed under --runInBand. A timeout that fires on load does not measure
    // the code under test; it measures the machine.
    testTimeout: 60000,
    testEnvironment: 'node',
    // Both extensions, deliberately. This pattern used to read `*.test.ts` only,
    // while the entire `test/unit/` tree is `.js` — so 24 files sat on disk that
    // jest never collected, and "48 suites green" said nothing whatsoever about
    // them. One of them, parsers/commit/parseCommitAsync.test.js, was holding a
    // 100% CPU infinite loop in the shipped changelog path.
    //
    // A pattern cannot be trusted to stay inclusive on its own: widening it is
    // what test/checks/collection-parity.test.ts enforces, by comparing the test
    // files on disk against the suites jest actually collects.
    testMatch: ['**/test/**/*.test.ts', '**/test/**/*.test.js']
};
