/**
 * Tests for the git timestamp utility (openspec: the sitemap stage populates
 * `page.lastUpdated` from the last git commit). `formatLastUpdated` is a pure
 * formatter (UTC + 3h → `DD.MM.YYYY HH:MM GMT+03`); `getFileTimestamp` runs
 * `git log -1 --format=%ct` and is multi-repo aware. These are non-trivial:
 * `lastUpdated` feeds the footer of every content page, and a wrong timestamp
 * or format drifts golden output across the whole site.
 *
 * @module test/timestamp
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { formatLastUpdated, getFileTimestamp, resetTimestampCache } from '../utils/timestamp.js';

const execFileAsync = promisify(execFile);

/**
 * Resolve the absolute path to the `git` binary. `execFile`/`spawn` with a bare
 * `'git'` name fails with `ENXIO` under the Node test runner in some
 * environments (no shell PATH lookup for spawned children), so the test resolves
 * an absolute path once. Falls back to `'git'` when none of the standard
 * locations exist (real shells resolve it via PATH).
 */
function resolveGit(): string {
    for (const candidate of ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git']) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }
    return 'git';
}

const GIT_BIN = resolveGit();

/**
 * Run a git command inside `cwd` with a pinned identity (no global config needed).
 * `commitDate` (when set) pins BOTH the author and committer dates so `git log
 * --format=%ct` (committer time, what `getFileTimestamp` reads) is deterministic.
 *
 * Uses the async `execFile` (promisified) with an absolute git path rather than
 * `execFileSync('git', ...)`: the synchronous `spawnSync` path fails with `ENXIO`
 * under the Node child-process harness used by the test runner, and a bare
 * `'git'` name fails PATH lookup for spawned children in the same environment.
 * The commands and their contract are identical to the production
 * `getFileTimestamp`, which calls async execFile with an explicitly resolved
 * executable and no shell.
 */
async function git(args: string[], cwd: string, commitDate?: string): Promise<void> {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (commitDate) {
        env.GIT_COMMITTER_DATE = commitDate;
    }
    await execFileAsync(GIT_BIN, ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd,
        env,
    });
}

/** Create a tmp dir, `git init`, and commit `file.txt` at the given date. */
async function makeRepo(commitDate: string): Promise<{ dir: string; file: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-ts-'));
    await git(['init', '-q'], dir);
    const file = path.join(dir, 'file.txt');
    await writeFile(file, 'initial');
    await git(['add', 'file.txt'], dir);
    await git(['commit', '-q', '-m', 'init', '--date', commitDate], dir, commitDate);
    return { dir, file };
}

// ---- formatLastUpdated (pure formatter, UTC + 3h) ---------------------------

test('formatLastUpdated: epoch is 01.01.1970 03:00 GMT+03', () => {
    assert.equal(formatLastUpdated(0), '01.01.1970 03:00 GMT+03');
});

test('formatLastUpdated shifts UTC by +3 hours and formats DD.MM.YYYY HH:MM', () => {
    // 2025-01-18T11:33:20Z → +3h → 14:33:20Z → "18.01.2025 14:33 GMT+03".
    assert.equal(formatLastUpdated(1737200000), '18.01.2025 14:33 GMT+03');
});

test('formatLastUpdated zero-pads day, month, hours, minutes', () => {
    // 2024-01-01T00:05:00Z → +3h → 03:05 → "01.01.2024 03:05 GMT+03".
    assert.equal(formatLastUpdated(1704067500), '01.01.2024 03:05 GMT+03');
});

// ---- getFileTimestamp (git log -1 --format=%ct) -----------------------------

test('getFileTimestamp returns the last commit time for a tracked file', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        resetTimestampCache();
        const ts = await getFileTimestamp(file, dir);
        // Pinned committer date 2023-01-02T00:00:00Z in Unix seconds.
        assert.equal(ts, 1672617600);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp reflects an updated commit, not the initial one', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        // Amend the file and commit at a later date.
        await writeFile(file, 'updated');
        await git(['add', 'file.txt'], dir);
        await git(['commit', '-q', '-m', 'update', '--date', '2023-02-03T00:00:00Z'], dir, '2023-02-03T00:00:00Z');
        resetTimestampCache();
        const ts = await getFileTimestamp(file, dir);
        assert.equal(ts, 1675382400); // 2023-02-03T00:00:00Z
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp returns null for an untracked file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-ts-'));
    try {
        await git(['init', '-q'], dir);
        const untracked = path.join(dir, 'nope.txt');
        await writeFile(untracked, 'never committed');
        resetTimestampCache();
        const ts = await getFileTimestamp(untracked, dir);
        assert.equal(ts, null);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp preserves committed time when the worktree changes without a commit', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        resetTimestampCache();
        const first = await getFileTimestamp(file, dir);
        // A worktree-only edit does not change the last committed timestamp.
        await writeFile(file, 'changed, no commit');
        const second = await getFileTimestamp(file, dir);
        assert.equal(second, first);
        assert.equal(second, 1672617600);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp finds the file repository independently of process cwd', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        resetTimestampCache();
        assert.equal(await getFileTimestamp(file), 1672617600);
        assert.equal(await getFileTimestamp('file.txt', dir), 1672617600);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp refreshes between calls after another commit without a global reset', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        assert.equal(await getFileTimestamp(file, dir), 1672617600);
        await writeFile(file, 'next build');
        await git(['add', 'file.txt'], dir);
        await git(['commit', '-q', '-m', 'next', '--date', '2023-02-03T00:00:00Z'], dir, '2023-02-03T00:00:00Z');
        assert.equal(await getFileTimestamp(file, dir), 1675382400);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

import { mkdir, readFile, rename, chmod } from 'node:fs/promises';
import { runBuild } from './helpers/build.js';

test('getFileTimestamp distinguishes repositories whose names share a prefix', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-repo-prefix-'));
    const short = await makeRepo('2023-01-02T00:00:00Z');
    const long = await makeRepo('2023-02-03T00:00:00Z');
    const previousCwd = process.cwd();
    try {
        await mkdir(path.join(root, 'external'));
        await mkdir(path.join(root, 'config'));
        await rename(short.dir, path.join(root, 'external/content'));
        await rename(long.dir, path.join(root, 'external/content-more'));
        await writeFile(path.join(root, 'config/external.json'), '["https://example.test/content.git","https://example.test/content-more.git"]');
        process.chdir(root);
        assert.equal(await getFileTimestamp(path.join(root, 'external/content/file.txt')), 1672617600);
        assert.equal(await getFileTimestamp(path.join(root, 'external/content-more/file.txt')), 1675382400);
    } finally {
        process.chdir(previousCwd);
        await rm(root, { recursive: true, force: true });
        await rm(short.dir, { recursive: true, force: true });
        await rm(long.dir, { recursive: true, force: true });
    }
});

test('concurrent duplicate timestamp requests spawn one Git query per build cache', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-git-calls-'));
    try {
        const executable = path.join(dir, 'git');
        const log = path.join(dir, 'calls');
        await writeFile(executable, '#!/bin/sh\nprintf "call\\n" >> "$TIMESTAMP_LOG"\n/bin/sleep 0.03\nprintf "1672617600\\n"\n');
        await chmod(executable, 0o755);
        const moduleUrl = new URL('../utils/timestamp.ts', import.meta.url).href;
        const code = `import assert from 'node:assert/strict';
import {getFileTimestamp} from ${JSON.stringify(moduleUrl)};
const cache = new Map();
const file = ${JSON.stringify(path.join(dir, 'file.txt'))};
const values = await Promise.all(Array.from({length:20},()=>getFileTimestamp(file, undefined, cache)));
assert.deepEqual(values, Array(20).fill(1672617600));
await getFileTimestamp(file, undefined, cache);
await getFileTimestamp(file, undefined, new Map());`;
        await execFileAsync(process.execPath, ['--import', import.meta.resolve('tsx'), '--input-type=module', '-e', code], {
            cwd: dir,
            env: { ...process.env, PATH: dir, TIMESTAMP_LOG: log },
        });
        assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 2, 'one query in each build, including concurrent and repeated calls');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('public builds use each source repo timestamp and refresh it in a later build', async () => {
    const first = await makeRepo('2023-01-02T00:00:00Z');
    const second = await makeRepo('2023-02-03T00:00:00Z');
    try {
        for (const { dir } of [first, second]) {
            await mkdir(path.join(dir, 'config'));
            await mkdir(path.join(dir, 'content'));
            await writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
            await writeFile(path.join(dir, 'config/config-nuckty.ts'), `export default {targets:{default:{configDir:'config',outDir:'site'}},ext:['./document.mjs']};`);
            await writeFile(path.join(dir, 'config/site.json'), '{"bundles":[]}');
            await writeFile(path.join(dir, 'config/levels.json'), '["content"]');
            await writeFile(path.join(dir, 'config/sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n');
            await writeFile(path.join(dir, 'document.mjs'), 'export default env => env.document.register(data => ({tag:"html",content:data.page.lastUpdated}));');
            await writeFile(path.join(dir, 'content/index.md'), '# Home');
        }
        await git(['add', 'content/index.md'], first.dir);
        await git(['commit', '-q', '-m', 'content', '--date', '2023-01-02T00:00:00Z'], first.dir, '2023-01-02T00:00:00Z');
        await git(['add', 'content/index.md'], second.dir);
        await git(['commit', '-q', '-m', 'content', '--date', '2023-02-03T00:00:00Z'], second.dir, '2023-02-03T00:00:00Z');
        await runBuild({ cwd: first.dir, command: 'build' });
        await runBuild({ cwd: second.dir, command: 'build' });
        assert.match(await readFile(path.join(first.dir, 'site/html/index.html'), 'utf8'), /02\.01\.2023 03:00 GMT\+03/);
        assert.match(await readFile(path.join(second.dir, 'site/html/index.html'), 'utf8'), /03\.02\.2023 03:00 GMT\+03/);
        await writeFile(path.join(first.dir, 'content/index.md'), '# Updated');
        await git(['add', 'content/index.md'], first.dir);
        await git(['commit', '-q', '-m', 'updated', '--date', '2023-03-04T00:00:00Z'], first.dir, '2023-03-04T00:00:00Z');
        await runBuild({ cwd: first.dir, command: 'build' });
        assert.match(await readFile(path.join(first.dir, 'site/html/index.html'), 'utf8'), /04\.03\.2023 03:00 GMT\+03/);
    } finally {
        await rm(first.dir, { recursive: true, force: true });
        await rm(second.dir, { recursive: true, force: true });
    }
});

