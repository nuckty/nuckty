/**
 * Tests for the output-dir preflight (`src/utils/outdir-preflight.ts`) — the
 * RUNTIME-002 guard: `outDir` values that would make the `clean` stage delete
 * consumer sources (`.`, `..`, input dirs, colliding outDirs) must be rejected
 * before any filesystem mutation, while normal outDirs pass through.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preflightOutDirs, UnsafeOutDirError } from '../utils/outdir-preflight.js';

const cases: Array<{ name: string; targets: Array<{ name: string; outDir: string }>; ok: boolean }> = [
    { name: 'normal outDir passes', targets: [{ name: 'a', outDir: 'site/' }], ok: true },
    { name: 'nested outDir passes', targets: [{ name: 'a', outDir: 'dist/site-ru/' }], ok: true },
    { name: 'outDir "." rejected', targets: [{ name: 'a', outDir: '.' }], ok: false },
    { name: 'outDir ".." rejected', targets: [{ name: 'a', outDir: '..' }], ok: false },
    { name: 'outDir "../elsewhere" rejected', targets: [{ name: 'a', outDir: '../elsewhere' }], ok: false },
    { name: 'outDir "" rejected', targets: [{ name: 'a', outDir: '' }], ok: false },
    { name: 'outDir "config" rejected', targets: [{ name: 'a', outDir: 'config/' }], ok: false },
    { name: 'outDir "config/backup" rejected', targets: [{ name: 'a', outDir: 'config/backup' }], ok: false },
    { name: 'outDir "src" rejected', targets: [{ name: 'a', outDir: 'src' }], ok: false },
    { name: 'outDir "content" rejected', targets: [{ name: 'a', outDir: 'content' }], ok: false },
    { name: 'outDir ".build" rejected', targets: [{ name: 'a', outDir: '.build/' }], ok: false },
    { name: 'sibling outDirs pass', targets: [{ name: 'a', outDir: 'dist/x' }, { name: 'b', outDir: 'dist/y' }], ok: true },
    { name: 'same outDirs rejected', targets: [{ name: 'a', outDir: 'dist/x' }, { name: 'b', outDir: 'dist/x' }], ok: false },
    { name: 'nested outDirs rejected', targets: [{ name: 'a', outDir: 'dist/x' }, { name: 'b', outDir: 'dist/x/y' }], ok: false },
    { name: 'distinct outDirs pass', targets: [{ name: 'a', outDir: 'dist/ru' }, { name: 'b', outDir: 'dist-en' }], ok: true },
];

for (const c of cases) {
    test(`${c.ok ? 'accepts' : 'rejects'}: ${c.name}`, () => {
        if (c.ok) {
            assert.doesNotThrow(() => preflightOutDirs('/tmp/consumer', c.targets));
        } else {
            assert.throws(() => preflightOutDirs('/tmp/consumer', c.targets), UnsafeOutDirError);
        }
    });
}

test('rejection names the offending target and happens before mutation', () => {
    try {
        preflightOutDirs('/tmp/consumer', [{ name: 'default', outDir: '.' }]);
        assert.fail('expected UnsafeOutDirError');
    } catch (e) {
        assert.ok(e instanceof UnsafeOutDirError);
        assert.match(e.message, /default/);
    }
});

import { mkdtemp, mkdir, writeFile, symlink, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('preflight protects custom inputs and intermediate symlink destinations', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));
    try {
        await mkdir(path.join(root, 'content', 'nested'), { recursive: true });
        await mkdir(path.join(root, 'custom-config'), { recursive: true });
        await writeFile(path.join(root, 'content', 'nested', 'sentinel'), 'keep');
        await symlink(path.join(root, 'content'), path.join(root, 'alias'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'alias/nested' }]), UnsafeOutDirError);
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'custom-config', configDir: 'custom-config' }]), UnsafeOutDirError);
        assert.equal(await readFile(path.join(root, 'content', 'nested', 'sentinel'), 'utf8'), 'keep');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('preflight checks missing descendants, canonical output collisions and build-dir aliases', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));
    try {
        await mkdir(path.join(root, 'source'));
        await mkdir(path.join(root, 'dist'));
        await symlink(path.join(root, 'source'), path.join(root, 'alias'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'alias/missing/output' }], ['source']), /overlaps/);
        await symlink(path.join(root, 'dist'), path.join(root, 'other-dist'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'dist/site' }, { name: 'b', outDir: 'other-dist/site' }]), /overlapping outDirs/);
        await symlink(path.dirname(root), path.join(root, 'outside'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'outside/new-output' }]), /not a subdirectory/);
        await symlink(path.join(root, 'source'), path.join(root, '.build'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'a', outDir: 'site' }], ['source']), /\.build overlaps/);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('preflight refuses to clean service directories and their canonical aliases', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));
    const reservedDirs = ['.git', '.github', 'node_modules'] as const;

    try {
        for (const reservedDir of reservedDirs) {
            const protectedDir = path.join(root, reservedDir);
            const sentinel = path.join(protectedDir, 'REVIEW_SENTINEL');
            await mkdir(protectedDir, { recursive: true });
            await writeFile(sentinel, 'keep');
            await symlink(protectedDir, path.join(root, `${reservedDir}-alias`));

            for (const outDir of [reservedDir, path.join(reservedDir, 'nested'), path.join(`${reservedDir}-alias`, 'nested')]) {
                assert.throws(() => preflightOutDirs(root, [{ name: 'site', outDir }]), UnsafeOutDirError, outDir);
                assert.equal(await readFile(sentinel, 'utf8'), 'keep', `${outDir} must not remove the sentinel`);
            }
        }
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('preflight protects canonical targets of service-directory symlinks', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));
    const canonicalTarget = path.join(root, 'repository-metadata');
    const canonicalServiceDir = path.join(canonicalTarget, 'git-data');

    try {
        await mkdir(canonicalServiceDir, { recursive: true });
        await writeFile(path.join(canonicalServiceDir, 'REVIEW_SENTINEL'), 'keep');
        await symlink(canonicalServiceDir, path.join(root, '.git'));

        for (const outDir of ['repository-metadata', 'repository-metadata/git-data/nested']) {
            assert.throws(() => preflightOutDirs(root, [{ name: 'site', outDir }]), UnsafeOutDirError, outDir);
            assert.equal(await readFile(path.join(canonicalServiceDir, 'REVIEW_SENTINEL'), 'utf8'), 'keep');
        }
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('preflight rejects existing non-directory outputs and preserves their contents', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));

    try {
        for (const fileName of ['.gitignore', 'package.json']) {
            const file = path.join(root, fileName);
            await writeFile(file, 'REVIEW_SENTINEL');

            assert.throws(() => preflightOutDirs(root, [{ name: 'site', outDir: fileName }]), UnsafeOutDirError);
            assert.equal(await readFile(file, 'utf8'), 'REVIEW_SENTINEL');
        }

        await symlink(path.join(root, 'package.json'), path.join(root, 'package-alias'));
        assert.throws(() => preflightOutDirs(root, [{ name: 'site', outDir: 'package-alias' }]), UnsafeOutDirError);
        assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), 'REVIEW_SENTINEL');

        await writeFile(path.join(root, '.build'), 'BUILD_SENTINEL');
        assert.throws(() => preflightOutDirs(root, [{ name: 'site', outDir: 'site' }]), UnsafeOutDirError);
        assert.equal(await readFile(path.join(root, '.build'), 'utf8'), 'BUILD_SENTINEL');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('preflight accepts missing outputs and existing output directories', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-preflight-'));

    try {
        await mkdir(path.join(root, 'existing-output'));
        assert.doesNotThrow(() => preflightOutDirs(root, [
            { name: 'missing', outDir: 'missing-output' },
            { name: 'existing', outDir: 'existing-output' },
        ]));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
