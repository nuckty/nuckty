/**
 * Pure core-test selection — which `*.test.ts` files belong to the fast
 * `test:core` suite. Extracted from `config/run-core-tests.mjs` (which used to
 * hold both) so importing the selection rule in tests does not ALSO spawn the
 * test runner as a side effect of module evaluation (arch review, Wave A).
 *
 * Selection rule: every `*.test.ts` under `src/test/` EXCEPT those in the
 * `src/test/integration/` directory. Integration suites (the ones that spawn
 * the built CLI as a child process and require `dist/`) live there; pure
 * in-process unit tests of CLI seams (e.g. `cli-args.test.ts` testing
 * `parseArgs`) stay in `src/test/` and remain in the fast core suite.
 *
 * @module config/select-core-tests
 */

import path from 'node:path';

/**
 * Select the core (fast) test files from a list of absolute test paths: every
 * `*.test.ts` that is NOT inside an `integration/` directory. Exported as a
 * pure function so the selection rule can be tested directly.
 */
export function selectCoreTests(testFiles) {
    return testFiles
        .filter((f) => !f.includes(`${path.sep}integration${path.sep}`))
        .sort();
}
