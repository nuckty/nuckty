/**
 * Tests for the `resolveGitBin` PATH resolver in `src/utils/timestamp.ts`.
 *
 * Production `execFile('git', ...)` fails with `ENXIO` when a spawned child
 * cannot resolve a bare binary name via PATH (reproduced in this environment:
 * `execFile('git', ['--version'])` rejects `ENXIO` in plain Node, not only
 * under the test runner). `resolveGitBin` makes the lookup explicit and
 * cacheable. These tests drive the resolver directly with controlled PATH
 * values (no `process.env` mutation) to cover: multiple PATH entries, a
 * non-executable regular file named `git` (skipped on POSIX), a directory
 * named `git` (skipped), a non-executable `git.exe` (skipped on POSIX), an
 * empty PATH entry, paths containing spaces, missing git, and the Windows
 * `git.exe` policy (exercised on POSIX through the injectable `isWin` argument
 * — not a claim of local Windows verification).
 *
 * @module test/timestamp-resolver
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { resolveGitBin } from '../utils/timestamp.js';

const DELIM = ':'; // POSIX; tests run on macOS/Linux
const EXEC = 0o755;

/** Write a git executable: a regular file with the execute bit set. */
async function writeGitExec(dir: string, name = 'git'): Promise<string> {
    const p = path.join(dir, name);
    await writeFile(p, '#!/bin/sh\necho git\n');
    await chmod(p, EXEC);
    return p;
}

test('resolveGitBin: returns the first PATH entry containing an executable git', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    const b = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        const ga = await writeGitExec(a);
        const gb = await writeGitExec(b);
        const result = resolveGitBin([a, b].join(DELIM), DELIM);
        assert.equal(result, ga, 'first entry wins');
        assert.notEqual(result, gb);
    } finally {
        await rm(a, { recursive: true, force: true });
        await rm(b, { recursive: true, force: true });
    }
});

test('resolveGitBin: a directory named git is rejected (not a regular file)', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    const b = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        // A directory literally named `git` — existsSync/isFile alone must not
        // match it.
        await mkdir(path.join(a, 'git'), { recursive: true });
        const gb = await writeGitExec(b);
        const result = resolveGitBin([a, b].join(DELIM), DELIM);
        assert.equal(result, gb, 'directory named git is skipped for the next entry');
    } finally {
        await rm(a, { recursive: true, force: true });
        await rm(b, { recursive: true, force: true });
    }
});

test('resolveGitBin: a non-executable regular file named git is rejected on POSIX, a later executable wins', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    const b = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        // A regular file named `git` WITHOUT the execute bit — isFile() matches
        // but it cannot be run, so the resolver must skip it on POSIX.
        await writeFile(path.join(a, 'git'), 'not executable');
        const gb = await writeGitExec(b);
        const result = resolveGitBin([a, b].join(DELIM), DELIM);
        assert.equal(result, gb, 'non-executable regular file is skipped for the later executable');
    } finally {
        await rm(a, { recursive: true, force: true });
        await rm(b, { recursive: true, force: true });
    }
});

test('resolveGitBin: an empty PATH entry is skipped without error', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        await writeGitExec(a);
        // Leading + trailing + middle empty entries (e.g. `:a:`).
        const result = resolveGitBin(['', a, ''].join(DELIM), DELIM);
        assert.equal(result, path.join(a, 'git'));
    } finally {
        await rm(a, { recursive: true, force: true });
    }
});

test('resolveGitBin: an executable in a PATH entry containing spaces resolves correctly', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'rg-'));
    const spaced = path.join(parent, 'with space dir');
    try {
        await mkdir(spaced, { recursive: true });
        const g = await writeGitExec(spaced);
        const result = resolveGitBin(spaced, DELIM);
        assert.equal(result, g);
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
});

test('resolveGitBin: falls back to bare "git" when no entry contains a usable candidate', () => {
    // After the executability check, a PATH with only non-executable files or
    // missing entries still falls back to the bare name.
    assert.equal(resolveGitBin(['/nonexistent-1', '/nonexistent-2'].join(DELIM), DELIM), 'git');
});

test('resolveGitBin: empty PATH falls back to bare "git"', () => {
    assert.equal(resolveGitBin('', DELIM), 'git');
});

test('resolveGitBin (POSIX): a non-executable git.exe is rejected, a later executable plain git wins', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    const b = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        // A regular `git.exe` WITHOUT the execute bit must be skipped on POSIX
        // (the X_OK check applies to both `git` and `git.exe`).
        await writeFile(path.join(a, 'git.exe'), 'MZ');
        const gb = await writeGitExec(b);
        const result = resolveGitBin([a, b].join(DELIM), DELIM);
        assert.equal(result, gb, 'non-executable git.exe skipped for the later executable git');
    } finally {
        await rm(a, { recursive: true, force: true });
        await rm(b, { recursive: true, force: true });
    }
});

test('resolveGitBin (POSIX): a non-executable git.exe alone falls back to bare "git"', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        await writeFile(path.join(a, 'git.exe'), 'MZ');
        // No executable candidate → bare 'git' fallback (not the non-executable git.exe).
        assert.equal(resolveGitBin(a, DELIM), 'git');
    } finally {
        await rm(a, { recursive: true, force: true });
    }
});

test('resolveGitBin (Windows policy, verified on POSIX via injectable isWin): a regular git.exe is accepted without X_OK', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        // On Windows the POSIX execute bit is not an execute proxy, so a regular
        // git.exe is accepted as-is. This test exercises that POLICY through the
        // injectable `isWin` argument on a POSIX host — it does NOT verify
        // Windows itself; the current core CI workflow runs on Ubuntu.
        await writeFile(path.join(a, 'git.exe'), 'MZ');
        const result = resolveGitBin(a, DELIM, true);
        assert.equal(result, path.join(a, 'git.exe'));
    } finally {
        await rm(a, { recursive: true, force: true });
    }
});

test('resolveGitBin: prefers an executable plain git over git.exe when both exist', async () => {
    const a = await mkdtemp(path.join(tmpdir(), 'rg-'));
    try {
        const g = await writeGitExec(a);
        await writeFile(path.join(a, 'git.exe'), 'MZ');
        const result = resolveGitBin(a, DELIM);
        assert.equal(result, g, 'executable plain git preferred over git.exe');
    } finally {
        await rm(a, { recursive: true, force: true });
    }
});
