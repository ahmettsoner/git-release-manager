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
    // SERIAL, and the timeout above is not what makes it necessary.
    //
    // Raising the timeout addressed one symptom — cases that were merely slow
    // under load. It cannot address the other one: these suites share fixture
    // directories, and setup begins with `rm -rf` (projectSetup.freshDirectory).
    // A worker running case A deletes the directory a concurrently-running
    // worker is CHDIR'd into, and that worker's next git call dies with "fatal:
    // Unable to read current working directory". No timeout reaches that.
    //
    // Measured 2026-08-03 on one machine, same commit, back to back:
    //   jest              41 failed, 183 tests collected
    //   jest --runInBand  0 failed, 192 tests collected, 63/63 suites
    //
    // Note the SECOND number, which is the one that matters. The parallel run
    // did not merely go red — it reported a smaller POPULATION, because workers
    // died carrying their remaining cases with them. A green parallel run would
    // therefore have been green over nine tests that never executed, and
    // nothing in the output would have said so. That is the failure mode
    // collection-parity.test.ts exists to prevent at the file level, arriving
    // here through the scheduler instead.
    //
    // The real fix is per-case fixture isolation (a unique directory per test).
    // Until that lands, parallelism is not an optimisation available to this
    // suite, and pretending otherwise costs correctness of the seal itself.
    maxWorkers: 1,
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
