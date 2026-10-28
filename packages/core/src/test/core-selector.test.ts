/**
 * Tests for the core-test selector (`selectCoreTests`) in
 * `config/run-core-tests.mjs` — the pure function that decides which test
 * files the fast `test:core` suite runs. The rule is by capability (black-box
 * child-process integration suites live under `src/test/integration/` and are
 * excluded), not a broad `cli-` filename prefix, so pure in-process CLI unit
 * tests like `cli-args.test.ts` stay in the fast suite.
 *
 * @module test/core-selector
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { selectCoreTests } from '../../config/select-core-tests.mjs';

const SEP = path.sep;
const T = 'src/test';

test('selectCoreTests: includes a pure CLI unit test (cli-args.test.ts)', () => {
    const files = [`${T}/cli-args.test.ts`, `${T}/naming.test.ts`];
    const out = selectCoreTests(files);
    assert.ok(out.includes(`${T}/cli-args.test.ts`), 'cli-args unit test retained');
});

test('selectCoreTests: excludes the black-box integration suites under src/test/integration/', () => {
    const files = [
        `${T}/cli-args.test.ts`,
        `${T}${SEP}integration${SEP}cli-build.test.ts`,
        `${T}${SEP}integration${SEP}cli-commands.test.ts`,
        `${T}/naming.test.ts`,
    ];
    const out = selectCoreTests(files);
    assert.ok(!out.some((f) => f.includes(`integration${SEP}cli-build`)), 'cli-build integration excluded');
    assert.ok(!out.some((f) => f.includes(`integration${SEP}cli-commands`)), 'cli-commands integration excluded');
    assert.ok(out.includes(`${T}/cli-args.test.ts`), 'cli-args still included');
    assert.ok(out.includes(`${T}/naming.test.ts`), 'ordinary test included');
});

test('selectCoreTests: a newly added ordinary test is included', () => {
    const files = [`${T}/new-feature.test.ts`];
    const out = selectCoreTests(files);
    assert.deepEqual(out, [`${T}/new-feature.test.ts`]);
});

test('selectCoreTests: a newly added integration test under integration/ is excluded', () => {
    const files = [`${T}${SEP}integration${SEP}new-cli-suite.test.ts`];
    const out = selectCoreTests(files);
    assert.deepEqual(out, [], 'new integration suite excluded');
});

test('selectCoreTests: returns paths sorted', () => {
    const files = [`${T}/z.test.ts`, `${T}/a.test.ts`, `${T}/m.test.ts`];
    const out = selectCoreTests(files);
    assert.deepEqual(out, [`${T}/a.test.ts`, `${T}/m.test.ts`, `${T}/z.test.ts`]);
});

test('selectCoreTests: ignores a path that merely contains "integration" as a substring, not a directory', () => {
    // A file literally named with "integration" but NOT in an integration/
    // directory stays in the core suite.
    const files = [`${T}/integration-helpers.test.ts`];
    const out = selectCoreTests(files);
    assert.deepEqual(out, [`${T}/integration-helpers.test.ts`]);
});
