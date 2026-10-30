#!/usr/bin/env node
/**
 * Core test runner — enumerates the in-process unit tests and runs them with
 * `node --test --import tsx`. Used by the `test:core` npm script. The
 * selection rule lives in `config/select-core-tests.mjs` (a pure module, safe
 * to import from tests); this script is the executable side: collect every
 * `*.test.ts` under `src/test/`, apply the rule, spawn `node --test`, exit
 * with its code. A newly added ordinary unit test is picked up automatically;
 * a newly added integration suite must be placed under `src/test/integration/`
 * to be excluded from `test:core` (it stays mandatory in `npm test` and
 * `test:coverage`, which run every test under `src/test/`).
 *
 * @module config/run-core-tests
 */

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectCoreTests } from './select-core-tests.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Recursively collect `*.test.ts` files under a directory.
 */
function collectTestFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...collectTestFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
            out.push(full);
        }
    }
    return out;
}

const allTests = collectTestFiles(path.join(projectRoot, 'src', 'test'));
const files = selectCoreTests(allTests).map((f) => path.relative(projectRoot, f));

if (files.length === 0) {
    console.error('config/run-core-tests: no core test files found under src/test/');
    process.exit(1);
}

const child = spawn(process.execPath, ['--test', '--import', 'tsx', ...files], {
    cwd: projectRoot,
    stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 1));
