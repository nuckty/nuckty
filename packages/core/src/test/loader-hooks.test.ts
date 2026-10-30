/**
 * Direct tests for the ESM loader hooks in `src/bin/loader.ts` — exercises the
 * `resolve` hook (relative `.js` → `.ts` rewrite when a `.ts` sibling exists)
 * and the `load` hook (esbuild transpile of `.ts` URLs to ESM), plus the
 * delegation paths (non-`.js` specifiers, missing `.ts` siblings, non-`.ts`
 * URLs passed through to `nextLoad`). These run in-process so the loader
 * source is covered directly; the child-process CLI tests cover the same
 * hooks end-to-end as black-box behavior.
 *
 * @module test/loader-hooks
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolve, load } from '../bin/loader.js';

const DEFAULT_CONTEXT = {};

/** A `nextResolve` that records the call and returns a synthetic result. */
function nextResolveRecording(): { calls: string[]; fn: (s: string, c: { parentURL?: string }) => Promise<{ url: string; format?: string; shortCircuit?: boolean }> } {
    const calls: string[] = [];
    return {
        calls,
        fn: async (specifier: string, _context: { parentURL?: string }) => {
            calls.push(specifier);
            return { url: pathToFileURL(specifier).href, format: 'module', shortCircuit: true };
        },
    };
}

test('resolve: a relative .js specifier with a .ts sibling is rewritten to the .ts file URL', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        await writeFile(path.join(dir, 'mod.ts'), 'export const x = 1;\n');
        const parentUrl = pathToFileURL(path.join(dir, 'parent.ts')).href;
        const next = nextResolveRecording();
        const result = await resolve('./mod.js', { parentURL: parentUrl }, next.fn);
        assert.equal(result.url, pathToFileURL(path.join(dir, 'mod.ts')).href);
        assert.equal(result.format, 'module');
        assert.equal(result.shortCircuit, true);
        // nextResolve was NOT called (short-circuited).
        assert.equal(next.calls.length, 0);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve: a relative .js specifier with NO .ts sibling delegates to nextResolve', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        // No mod.ts on disk — the hook must fall through to the default resolver.
        const parentUrl = pathToFileURL(path.join(dir, 'parent.ts')).href;
        const next = nextResolveRecording();
        const result = await resolve('./mod.js', { parentURL: parentUrl }, next.fn);
        assert.equal(next.calls.length, 1, 'delegated to nextResolve');
        assert.equal(next.calls[0], './mod.js');
        assert.equal(result.url, pathToFileURL('./mod.js').href);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve: a bare specifier (npm package name) delegates to nextResolve unchanged', async () => {
    const next = nextResolveRecording();
    await resolve('some-package', DEFAULT_CONTEXT, next.fn);
    assert.equal(next.calls[0], 'some-package');
});

test('resolve: a relative specifier without a .js extension delegates unchanged', async () => {
    const next = nextResolveRecording();
    await resolve('./mod.css', DEFAULT_CONTEXT, next.fn);
    assert.equal(next.calls[0], './mod.css');
});

test('resolve: a ../ relative .js specifier with a .ts sibling resolves against the parent dir', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        await writeFile(path.join(dir, 'sibling.ts'), 'export const y = 2;\n');
        const sub = path.join(dir, 'sub');
        await mkdir(sub, { recursive: true });
        const parentUrl = pathToFileURL(path.join(sub, 'parent.ts')).href;
        const next = nextResolveRecording();
        const result = await resolve('../sibling.js', { parentURL: parentUrl }, next.fn);
        assert.equal(result.url, pathToFileURL(path.join(dir, 'sibling.ts')).href);
        assert.equal(next.calls.length, 0);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

/** A `nextLoad` that returns a synthetic module source for non-.ts URLs. */
function nextLoadSynthetic(): (url: string, c: unknown) => Promise<{ format: string; source: string; shortCircuit?: boolean }> {
    return async (url: string, _c: unknown) => ({ format: 'module', source: `/*synthetic ${url}*/`, shortCircuit: true });
}

test('load: a .ts URL is transpiled to ESM via esbuild', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        const tsPath = path.join(dir, 'thing.ts');
        await writeFile(tsPath, 'export const answer: number = 42;\n');
        const url = pathToFileURL(tsPath).href;
        const result = await load(url, {}, nextLoadSynthetic());
        assert.equal(result.format, 'module');
        assert.ok(result.source.includes('answer'), 'transpiled source retains the identifier');
        assert.ok(!result.source.includes(': number'), 'TypeScript type annotation stripped');
        assert.equal(result.shortCircuit, true);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('load: a non-.ts URL delegates to nextLoad unchanged', async () => {
    const next = nextLoadSynthetic();
    const result = await load('file:///some/file.js', {}, next);
    assert.ok(result.source.includes('synthetic'), 'non-.ts URL passed through to nextLoad');
});

test('load: a .ts URL with JSX-free code transpiles to a valid ESM export', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        const tsPath = path.join(dir, 'fn.ts');
        await writeFile(tsPath, 'export function add(a: number, b: number): number { return a + b; }\n');
        const result = await load(pathToFileURL(tsPath).href, {}, nextLoadSynthetic());
        // The transpiled source is executable ESM: evaluate it and check the export.
        const mod = await import(new URL(`data:text/javascript;base64,${Buffer.from(result.source).toString('base64')}`).href);
        assert.equal(typeof mod.add, 'function');
        assert.equal(mod.add(2, 3), 5);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve: a JS parent importing .js gets the REAL js file even when a .ts sibling exists', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        await writeFile(path.join(dir, 'mod.js'), 'export const x = 1;\n');
        await writeFile(path.join(dir, 'mod.ts'), 'export const x = 2;\n');
        const parentUrl = pathToFileURL(path.join(dir, 'parent.js')).href;
        const next = nextResolveRecording();
        await resolve('./mod.js', { parentURL: parentUrl }, next.fn);
        assert.equal(next.calls.length, 1, 'compiled JS parents must use normal Node resolution');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve: a TS parent importing an EXISTING .js file keeps the .js (no substitution)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        // Both files on disk: the real .js wins — the hook only fills gaps.
        await writeFile(path.join(dir, 'mod.js'), 'export const x = 1;\n');
        await writeFile(path.join(dir, 'mod.ts'), 'export const x = 2;\n');
        const parentUrl = pathToFileURL(path.join(dir, 'parent.ts')).href;
        const next = nextResolveRecording();
        await resolve('./mod.js', { parentURL: parentUrl }, next.fn);
        assert.equal(next.calls.length, 1, 'existing .js must not be swapped for the .ts neighbor');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve: a TS parent with a MISSING .js and a present .ts sibling still rewrites', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-'));
    try {
        await writeFile(path.join(dir, 'mod.ts'), 'export const x = 2;\n');
        const parentUrl = pathToFileURL(path.join(dir, 'parent.ts')).href;
        const next = nextResolveRecording();
        const result = await resolve('./mod.js', { parentURL: parentUrl }, next.fn);
        assert.equal(result.url, pathToFileURL(path.join(dir, 'mod.ts')).href);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('resolve/load handle TypeScript file URLs with query and hash', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-loader-query-'));
    try {
        await writeFile(path.join(dir, 'helper.ts'), 'export const value: number = 42;');
        const parent = new URL(pathToFileURL(path.join(dir, 'config.ts')).href);
        parent.search = '?nucktyBuild=2';
        parent.hash = '#entry';
        const next = nextResolveRecording();
        const resolved = await resolve('./helper.js?variant=one#helper', { parentURL: parent.href }, next.fn);
        const expected = pathToFileURL(path.join(dir, 'helper.ts'));
        expected.search = '?variant=one';
        expected.hash = '#helper';
        assert.equal(resolved.url, expected.href);
        assert.equal(next.calls.length, 0);
        const loaded = await load(resolved.url, {}, nextLoadSynthetic());
        assert.equal(loaded.shortCircuit, true);
        assert.equal(loaded.format, 'module');
        assert.match(loaded.source, /value = 42/);
        assert.doesNotMatch(loaded.source, /: number/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
