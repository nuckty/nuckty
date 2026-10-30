/** Git commit timestamps of page sources (`page.lastUpdated`, Unix seconds). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { getFileTimestamp } from '../utils/timestamp.js';

const execFileAsync = promisify(execFile);

/** Run git with a pinned identity; `commitDate` pins the committer date read by `%ct`. */
async function git(args: string[], cwd: string, commitDate?: string): Promise<void> {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (commitDate) {
        env.GIT_COMMITTER_DATE = commitDate;
    }
    await execFileAsync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
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

// ---- getFileTimestamp (git log -1 --format=%ct) -----------------------------

test('getFileTimestamp returns the last commit time for a tracked file', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        const ts = await getFileTimestamp(file, new Map());
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
        const ts = await getFileTimestamp(file, new Map());
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
        const ts = await getFileTimestamp(untracked, new Map());
        assert.equal(ts, null);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp preserves committed time when the worktree changes without a commit', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        const first = await getFileTimestamp(file, new Map());
        // A worktree-only edit does not change the last committed timestamp.
        await writeFile(file, 'changed, no commit');
        const second = await getFileTimestamp(file, new Map());
        assert.equal(second, first);
        assert.equal(second, 1672617600);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp finds the file repository independently of process cwd', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        assert.equal(await getFileTimestamp(file, new Map()), 1672617600);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getFileTimestamp refreshes between calls after another commit without a global reset', async () => {
    const { dir, file } = await makeRepo('2023-01-02T00:00:00Z');
    try {
        assert.equal(await getFileTimestamp(file, new Map()), 1672617600);
        await writeFile(file, 'next build');
        await git(['add', 'file.txt'], dir);
        await git(['commit', '-q', '-m', 'next', '--date', '2023-02-03T00:00:00Z'], dir, '2023-02-03T00:00:00Z');
        assert.equal(await getFileTimestamp(file, new Map()), 1675382400);
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
        assert.equal(await getFileTimestamp(path.join(root, 'external/content/file.txt'), new Map()), 1672617600);
        assert.equal(await getFileTimestamp(path.join(root, 'external/content-more/file.txt'), new Map()), 1675382400);
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
const values = await Promise.all(Array.from({length:20},()=>getFileTimestamp(file, cache)));
assert.deepEqual(values, Array(20).fill(1672617600));
await getFileTimestamp(file, cache);
await getFileTimestamp(file, new Map());`;
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
            await writeFile(path.join(dir, 'document.mjs'), 'export default env => env.document.register(data => ({tag:"html",content:String(data.page.lastUpdated)}));');
            await writeFile(path.join(dir, 'content/index.md'), '# Home');
        }
        await git(['add', 'content/index.md'], first.dir);
        await git(['commit', '-q', '-m', 'content', '--date', '2023-01-02T00:00:00Z'], first.dir, '2023-01-02T00:00:00Z');
        await git(['add', 'content/index.md'], second.dir);
        await git(['commit', '-q', '-m', 'content', '--date', '2023-02-03T00:00:00Z'], second.dir, '2023-02-03T00:00:00Z');
        await runBuild({ cwd: first.dir, command: 'build' });
        await runBuild({ cwd: second.dir, command: 'build' });
        assert.match(await readFile(path.join(first.dir, 'site/html/index.html'), 'utf8'), /1672617600/);
        assert.match(await readFile(path.join(second.dir, 'site/html/index.html'), 'utf8'), /1675382400/);
        await writeFile(path.join(first.dir, 'content/index.md'), '# Updated');
        await git(['add', 'content/index.md'], first.dir);
        await git(['commit', '-q', '-m', 'updated', '--date', '2023-03-04T00:00:00Z'], first.dir, '2023-03-04T00:00:00Z');
        await runBuild({ cwd: first.dir, command: 'build' });
        assert.match(await readFile(path.join(first.dir, 'site/html/index.html'), 'utf8'), /1677888000/);
    } finally {
        await rm(first.dir, { recursive: true, force: true });
        await rm(second.dir, { recursive: true, force: true });
    }
});
