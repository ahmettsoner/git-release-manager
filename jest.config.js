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
    testMatch: ['**/test/**/*.test.ts']
};
