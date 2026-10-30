/**
 * Tests for the extension loader: registration contract, error on missing
 * register, local-path resolution. Uses synthetic extension modules on disk.
 *
 * Registration uses the public extension facades. Block templates load
 * separately through bundle declarations and configured levels.
 *
 * @module test/loader
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadPlugins } from '../env/loader.js';
import { NucktyEnv } from '../env/env.js';

test('loader invokes an extension with register()', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
    try {
        await writeFile(
            path.join(dir, 'ext.mjs'),
            `export function register(env) { env.commands.add('x', 'x', async () => 0); }\n`,
        );
        const env = new NucktyEnv();
        await loadPlugins(env, ['./ext.mjs'], { cwd: dir });
        assert.ok(env.commands.has('x'));
    } finally {
        await rm(dir, { recursive: true });
    }
});

test('loader invokes an extension with default export', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
    try {
        await writeFile(
            path.join(dir, 'p.mjs'),
            `export default function (env) { env.levels.add('blocks'); }\n`,
        );
        const env = new NucktyEnv();
        await loadPlugins(env, ['./p.mjs'], { cwd: dir });
        assert.deepEqual(env.levels.list(), ['blocks']);
    } finally {
        await rm(dir, { recursive: true });
    }
});

test('loader throws on extension missing register', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
    try {
        await writeFile(path.join(dir, 'bad.mjs'), `export const x = 1;\n`);
        const env = new NucktyEnv();
        await assert.rejects(() => loadPlugins(env, ['./bad.mjs'], { cwd: dir }), /register/);
    } finally {
        await rm(dir, { recursive: true });
    }
});

test('loader applies extensions in declaration order', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
    try {
        await mkdir(path.join(dir, 'a'));
        await mkdir(path.join(dir, 'b'));
        await writeFile(path.join(dir, 'a', 'index.mjs'), `export function register(env){env.commands.add('a','a',async()=>0);}\n`);
        await writeFile(path.join(dir, 'b', 'index.mjs'), `export function register(env){env.commands.add('b','b',async()=>0);}\n`);
        const env = new NucktyEnv();
        await loadPlugins(env, ['./a/index.mjs', './b/index.mjs'], { cwd: dir });
        assert.deepEqual(env.commands.list().map((c) => c.name), ['a', 'b']);
    } finally {
        await rm(dir, { recursive: true });
    }
});

for (const name of ['probe-ext', '@author/extension']) {
    test(`loader resolves ${name} from the consumer root`, async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
        try {
            await mkdir(path.join(dir, 'node_modules', name), { recursive: true });
            await writeFile(path.join(dir, 'package.json'), '{"name":"consumer","type":"module"}');
            await writeFile(
                path.join(dir, 'node_modules', name, 'package.json'),
                JSON.stringify({ name, type: 'module', main: './index.mjs' }),
            );
            await writeFile(
                path.join(dir, 'node_modules', name, 'index.mjs'),
                'export function register(env) { env.levels.add("probe"); }\n',
            );
            const env = new NucktyEnv();
            // The old code left the bare specifier untouched — import ran relative
            // to the ENGINE and failed (ERR_MODULE_NOT_FOUND from src/env/loader.ts).
            await loadPlugins(env, [name], { cwd: dir });
            assert.deepEqual(env.levels.list(), ['probe']);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
}

test('loader resolves a directory path through its package.json main', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-'));
    try {
        await mkdir(path.join(dir, 'blocks-local'), { recursive: true });
        await writeFile(
            path.join(dir, 'blocks-local', 'package.json'),
            '{"name":"blocks-local","type":"module","main":"./index.mjs"}',
        );
        await writeFile(
            path.join(dir, 'blocks-local', 'index.mjs'),
            'export function register(env) { env.levels.add("local"); }\n',
        );
        const env = new NucktyEnv();
        // The old code returned a bare directory file URL (ERR_UNSUPPORTED_DIR_IMPORT).
        await loadPlugins(env, ['./blocks-local'], { cwd: dir });
        assert.deepEqual(env.levels.list(), ['local']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('consumer ESM exports choose import rather than require conditions', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-import-'));
    try {
        await mkdir(path.join(dir, 'node_modules', 'conditional'), { recursive: true });
        await writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
        const pkg = path.join(dir, 'node_modules', 'conditional');
        await writeFile(path.join(pkg, 'package.json'), JSON.stringify({
            name: 'conditional', type: 'module', exports: { '.': { import: './index.mjs', require: './wrong.cjs' } },
        }));
        await writeFile(path.join(pkg, 'index.mjs'), 'export default env => env.levels.add("import");');
        await writeFile(path.join(pkg, 'wrong.cjs'), 'throw new Error("require condition selected");');
        const env = new NucktyEnv();
        await loadPlugins(env, ['conditional'], { cwd: dir });
        assert.deepEqual(env.levels.list(), ['import']);
        await mkdir(path.join(dir, 'node_modules', 'import-only'));
        await writeFile(path.join(dir, 'node_modules', 'import-only', 'package.json'), JSON.stringify({
            name: 'import-only', type: 'module', exports: { '.': { import: './index.mjs' } },
        }));
        await writeFile(path.join(dir, 'node_modules', 'import-only', 'index.mjs'), 'export default env => env.levels.add("only");');
        await loadPlugins(env, ['import-only'], { cwd: dir });
        assert.deepEqual(env.levels.list(), ['import', 'only']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('local conditional exports honor nested conditions and declaration order', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-local-conditions-'));

    try {
        const cases = [
            { node: { import: './selected.mjs' }, default: './wrong.mjs' },
            { default: './selected.mjs', import: './wrong.mjs' },
            { require: './wrong.mjs', import: './selected.mjs' },
        ];

        for (const [index, conditions] of cases.entries()) {
            const name = `extension-${index}`;
            const pkg = path.join(dir, name);

            await mkdir(pkg);
            await writeFile(path.join(pkg, 'package.json'), JSON.stringify({ type: 'module', exports: { '.': conditions } }));
            await writeFile(path.join(pkg, 'selected.mjs'), `export default env => env.levels.add('${name}');`);
            await writeFile(path.join(pkg, 'wrong.mjs'), 'throw new Error("wrong condition selected");');
            const env = new NucktyEnv();

            await loadPlugins(env, [`./${name}`], { cwd: dir });
            assert.deepEqual(env.levels.list(), [name]);
        }
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('a local null export blocks fallback and main registration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-local-blocked-'));
    const pkg = path.join(dir, 'extension');

    try {
        await mkdir(pkg);
        await writeFile(path.join(pkg, 'package.json'), JSON.stringify({
            type: 'module', main: './wrong.mjs', exports: { '.': { node: null, default: './wrong.mjs' } },
        }));
        await writeFile(path.join(pkg, 'wrong.mjs'), 'export default env => env.levels.add("wrong");');
        const env = new NucktyEnv();

        await assert.rejects(() => loadPlugins(env, ['./extension'], { cwd: dir }), /without a resolvable main\/exports entry/);
        assert.deepEqual(env.levels.list(), []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('local exports skip invalid array targets but reject invalid active conditions', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-local-invalid-'));
    const pkg = path.join(dir, 'extension');

    try {
        await mkdir(pkg);
        await writeFile(path.join(dir, 'outside.mjs'), 'throw new Error("escaped package");');
        await writeFile(path.join(pkg, 'index.mjs'), 'export default env => env.levels.add("inside");');
        const metadata = path.join(pkg, 'package.json');

        await writeFile(metadata, JSON.stringify({ type: 'module', exports: ['../outside.mjs', './index.mjs'] }));
        const env = new NucktyEnv();

        await loadPlugins(env, ['./extension'], { cwd: dir });
        assert.deepEqual(env.levels.list(), ['inside']);
        await writeFile(metadata, JSON.stringify({ type: 'module', exports: { node: 42, default: './index.mjs' } }));
        await assert.rejects(() => loadPlugins(new NucktyEnv(), ['./extension'], { cwd: dir }), { code: 'ERR_INVALID_PACKAGE_TARGET' });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('local export targets retain encoded paths, query and fragment identity', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-local-url-'));

    try {
        for (const [index, suffix] of ['?mode=one#entry', '?redirect=../assets/img.png#entry'].entries()) {
            const name = `extension-${index}`;
            const pkg = path.join(dir, name);

            await mkdir(pkg);
            await writeFile(path.join(pkg, 'package.json'), JSON.stringify({ type: 'module', exports: `./selected%20name.mjs${suffix}` }));
            await writeFile(path.join(pkg, 'selected name.mjs'), 'export default env => { const url = new URL(import.meta.url); env.levels.add(url.search + url.hash); };');
            const env = new NucktyEnv();

            await loadPlugins(env, [`./${name}`], { cwd: dir });
            assert.deepEqual(env.levels.list(), [suffix]);
        }
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

