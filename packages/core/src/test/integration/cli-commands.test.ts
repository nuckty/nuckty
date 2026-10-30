/**
 * CLI command-path tests — exercises the built CLI (`dist/bin/nuckty.js`) as a
 * child process across its command surface: `--help`, `--version`, no args,
 * an unknown command, a known extension command, `build`, and a named target.
 * Asserts stdout, stderr, and the exit code separately. Also covers help when
 * the consumer config or an extension cannot be loaded, flags with and
 * without values, positional forwarding, and that a command extension's
 * returned exit code becomes the CLI exit code.
 *
 * Like cli-build.test.ts, these tests require `npm run build` to have run
 * (they exercise `dist/bin/nuckty.js`); they fail with an actionable message
 * when dist is absent rather than skipping.
 *
 * @module test/cli-commands
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, symlinkSync } from 'node:fs';

const execFileAsync = promisify(execFile);

const NUCKTY_BIN = fileURLToPath(new URL('../../../dist/bin/nuckty.js', import.meta.url));
const PROJECT_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const PACKAGE_VERSION = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;

/**
 * These tests exercise the built CLI (`dist/bin/nuckty.js`), so they require
 * `npm run build` to have run. The canonical `npm test` and `npm run
 * test:coverage` both build `dist` first; invoking a low-level runner without
 * building fails here with an actionable assertion rather than skipping.
 */
function assertBuildReady(): void {
    if (!existsSync(NUCKTY_BIN)) {
        throw new Error(
            `CLI command tests require the built artifact at ${NUCKTY_BIN}. ` +
                'Run `npm run build` (or `npm test`, which builds first) before running these tests.',
        );
    }
}

/** Spawn the built CLI, capturing stdout, stderr, and exit code separately. */
async function runNuckty(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
    assertBuildReady();
    try {
        const { stdout, stderr } = await execFileAsync(process.execPath, [NUCKTY_BIN, ...args], {
            cwd,
            env: process.env,
        });
        return { stdout, stderr, code: 0 };
    } catch (e) {
        const err = e as { stdout?: string; stderr?: string; code?: number };
        return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.code ?? 1 };
    }
}

/** Link the local nuckty build into a consumer's node_modules so `import '@nuckty/core'` resolves. */
async function linkNuckty(consumerDir: string): Promise<void> {
    const nmDir = path.join(consumerDir, 'node_modules', '@nuckty', 'core');
    await mkdir(path.dirname(nmDir), { recursive: true });
    // Use the synchronous `symlinkSync` (with the `type` argument): the
    // promisified `fs.promises.symlink` is mangled by the tsx loader under the
    // test runner. A symlink lets the consumer's `import '@nuckty/core'` resolve to
    // the real `node_modules` (so nuckty's own deps like `unified` resolve too).
    try {
        symlinkSync(PROJECT_ROOT, nmDir, 'dir');
        return;
    } catch {
        // already linked or unsupported — fall through to a copy
    }
    await mkdir(nmDir, { recursive: true });
    await writeFile(path.join(nmDir, 'package.json'), JSON.stringify({
        name: '@nuckty/core', version: '1.0.0', type: 'module', main: 'dist/index.js',
    }));
    await mkdir(path.join(nmDir, 'dist'), { recursive: true });
    const { copyFile } = await import('node:fs/promises');
    for (const f of ['index.js', 'index.d.ts']) {
        if (existsSync(path.join(PROJECT_ROOT, 'dist', f))) {
            await copyFile(path.join(PROJECT_ROOT, 'dist', f), path.join(nmDir, 'dist', f));
        }
    }
}

/** Build a temp consumer with two targets and a `greet` extension command. */
async function makeConsumer(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-cmd-'));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await mkdir(path.join(dir, 'content'), { recursive: true });
    await mkdir(path.join(dir, 'ext'), { recursive: true });
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'consumer' }));
    await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
        `import { defineNucktyConfig } from '@nuckty/core';\n` +
        `export default defineNucktyConfig({\n` +
        `  targets: {\n` +
        `    default: { configDir: 'config/', outDir: 'site/' },\n` +
        `    extra: { configDir: 'config/', outDir: 'site-extra/' },\n` +
        `  },\n` +
        `  ext: ['./ext/cmd.mjs', './ext/doc.mjs'],\n` +
        `});\n`);
    await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
        baseUrl: 'https://example.com', rootTitle: 'X', contentRepo: 'content',
        assetRepos: [], githubRawBase: null, bundles: ['page'],
    }));
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    await writeFile(path.join(dir, 'config', 'sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n');
    await writeFile(path.join(dir, 'content', 'index.md'), '# Home\n\nWelcome.\n');
    // A command extension that returns a custom exit code and reads positional
    // + flag arguments.
    await writeFile(path.join(dir, 'ext', 'cmd.mjs'),
        `export function register(env) {\n` +
        `  env.commands.add('greet', 'print a greeting', async (args) => {\n` +
        `    const name = args.positional[0] ?? (typeof args.flags['name'] === 'string' ? args.flags['name'] : 'world');\n` +
        `    const loud = args.flags['loud'] === true;\n` +
        `    process.stdout.write((loud ? 'HELLO ' : 'hello ') + name.toUpperCase() + '\\n');\n` +
        `    return 7;\n` +
        `  }, { booleanFlags: ['loud'] });\n` +
        `}\n`);
    // A document handler extension so `build` can complete.
    await writeFile(path.join(dir, 'ext', 'doc.mjs'),
        `export function register(env) {\n` +
        `  env.document.register((data) => ({ tag: 'html', content: [{ tag: 'body', content: data.content }] }));\n` +
        `}\n`);
    await linkNuckty(dir);
    return dir;
}

test('CLI --version prints the version to stdout and exits 0', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-ver-'));
    try {
        const { stdout, stderr, code } = await runNuckty(['--version'], dir);
        assert.equal(code, 0);
        assert.equal(stdout, `nuckty ${PACKAGE_VERSION}\n`);
        assert.equal(stderr, '');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI -v short flag also prints the version and exits 0', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-v-'));
    try {
        const { stdout, code } = await runNuckty(['-v'], dir);
        assert.equal(code, 0);
        assert.equal(stdout, `nuckty ${PACKAGE_VERSION}\n`);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI --help prints usage to stdout, lists extension commands, and exits 0', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, stderr, code } = await runNuckty(['--help'], dir);
        assert.equal(code, 0);
        assert.match(stdout, /nuckty —/);
        assert.match(stdout, /build \[target\]/);
        assert.match(stdout, /greet/, 'help lists the registered extension command');
        assert.match(stdout, /print a greeting/, 'help shows the extension command description');
        assert.equal(stderr, '');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI -h short flag prints the same help and exits 0', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty(['-h'], dir);
        assert.equal(code, 0);
        assert.match(stdout, /nuckty —/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI with no arguments prints help and exits 0', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty([], dir);
        assert.equal(code, 0);
        assert.match(stdout, /Usage:/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI rejects options before the command instead of treating them as a command', async () => {
    const dir = await makeConsumer();
    try {
        const { stderr, code } = await runNuckty(['--dry-run', 'greet'], dir);
        assert.equal(code, 1);
        assert.match(stderr, /command must appear before options/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build rejects flags and extra targets before cleaning output directories', async () => {
    const dir = await makeConsumer();
    try {
        for (const outDir of ['site', 'site-extra']) {
            const output = path.join(dir, outDir);
            await mkdir(output, { recursive: true });
            await writeFile(path.join(output, 'sentinel.txt'), 'preserve');
        }

        const invalidFlag = await runNuckty(['build', '--dry-run', 'staging'], dir);
        assert.equal(invalidFlag.code, 1);
        assert.match(invalidFlag.stderr, /build does not accept options/);
        assert.equal(await readFile(path.join(dir, 'site', 'sentinel.txt'), 'utf8'), 'preserve');
        assert.equal(await readFile(path.join(dir, 'site-extra', 'sentinel.txt'), 'utf8'), 'preserve');

        const emptyTarget = await runNuckty(['build', ''], dir);
        assert.equal(emptyTarget.code, 1);
        assert.match(emptyTarget.stderr, /unknown target ""/);
        assert.equal(await readFile(path.join(dir, 'site', 'sentinel.txt'), 'utf8'), 'preserve');
        assert.equal(await readFile(path.join(dir, 'site-extra', 'sentinel.txt'), 'utf8'), 'preserve');

        const extraTargets = await runNuckty(['build', 'default', 'extra'], dir);
        assert.equal(extraTargets.code, 1);
        assert.match(extraTargets.stderr, /at most one target/);
        assert.equal(await readFile(path.join(dir, 'site', 'sentinel.txt'), 'utf8'), 'preserve');
        assert.equal(await readFile(path.join(dir, 'site-extra', 'sentinel.txt'), 'utf8'), 'preserve');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build loads the consumer config once', async () => {
    const dir = await makeConsumer();
    try {
        const configPath = path.join(dir, 'config', 'config-nuckty.ts');
        const markerPath = path.join(dir, 'config-load-count.txt');
        const config = await readFile(configPath, 'utf8');

        await writeFile(configPath, config.replace(
            "import { defineNucktyConfig } from '@nuckty/core';",
            "import { defineNucktyConfig } from '@nuckty/core';\n" +
                "import { appendFileSync } from 'node:fs';\n" +
                `appendFileSync(${JSON.stringify(markerPath)}, 'x');`,
        ));

        const result = await runNuckty(['build'], dir);

        assert.equal(result.code, 0, result.stderr || result.stdout);
        assert.equal(await readFile(markerPath, 'utf8'), 'x');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build honors a leading-dash target after -- and rejects an unknown one before cleaning', async () => {
    const dir = await makeConsumer();
    try {
        const configPath = path.join(dir, 'config', 'config-nuckty.ts');
        const config = await readFile(configPath, 'utf8');

        await writeFile(configPath, config.replace(
            "    extra: { configDir: 'config/', outDir: 'site-extra/' },",
            "    extra: { configDir: 'config/', outDir: 'site-extra/' },\n" +
                "    '--preview': { configDir: 'config/', outDir: 'site-preview/' },",
        ));
        const declared = await runNuckty(['build', '--', '--preview'], dir);
        assert.equal(declared.code, 0, declared.stderr || declared.stdout);
        assert.match(await readFile(path.join(dir, 'site-preview', 'html', 'index.html'), 'utf8'), /^<!doctype html>/);

        await writeFile(path.join(dir, 'site-preview', 'sentinel.txt'), 'preserve');
        const unknown = await runNuckty(['build', '-x'], dir);
        assert.equal(unknown.code, 1);
        assert.match(unknown.stderr, /unknown target "-x"/);
        assert.equal(await readFile(path.join(dir, 'site-preview', 'sentinel.txt'), 'utf8'), 'preserve');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI unknown command writes an actionable error to stderr and exits 1', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, stderr, code } = await runNuckty(['frobnicate'], dir);
        assert.equal(code, 1, 'unknown command exits non-zero');
        assert.match(stderr, /unknown command "frobnicate"/, 'stderr names the unknown command');
        // The usage hint is printed to stdout (usage() writes to stdout), not stderr.
        assert.match(stdout, /Usage:/, 'usage hint printed to stdout after the error');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build (no target) builds the default target and exits 0', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, stderr, code } = await runNuckty(['build'], dir);
        assert.equal(code, 0, `build exits 0: ${stderr}`);
        assert.match(stdout, /built target "default"/, 'stdout reports the built target');
        assert.equal(stderr, '');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build <named-target> builds that target and exits 0', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty(['build', 'extra'], dir);
        assert.equal(code, 0);
        assert.match(stdout, /built target "extra" → site-extra\//, 'stdout reports the named target and its outDir');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build <unknown-target> exits 1 with an actionable stderr naming known targets', async () => {
    const dir = await makeConsumer();
    try {
        const { stderr, code } = await runNuckty(['build', 'ghost'], dir);
        assert.equal(code, 1);
        assert.match(stderr, /unknown target "ghost"/, 'stderr names the unknown target');
        assert.match(stderr, /default, extra/, 'stderr lists the known targets');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI extension command: returned exit code becomes the CLI exit code', async () => {
    const dir = await makeConsumer();
    try {
        // The greet extension returns 7; the CLI must propagate it.
        const { stdout, code } = await runNuckty(['greet'], dir);
        assert.equal(code, 7, 'extension exit code propagates as the CLI exit code');
        assert.match(stdout, /hello WORLD/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI forwards a positional argument to the extension command', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty(['greet', 'alice'], dir);
        assert.equal(code, 7);
        assert.match(stdout, /hello ALICE/, 'positional forwarded to the handler');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI parses a boolean flag (no value) and forwards it to the extension', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty(['greet', 'bob', '--loud'], dir);
        assert.equal(code, 7);
        assert.match(stdout, /HELLO BOB/, 'boolean flag toggled the handler behavior');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI parses a declared boolean flag before a positional value', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, code } = await runNuckty(['greet', '--loud', 'bob'], dir);
        assert.equal(code, 7);
        assert.match(stdout, /HELLO BOB/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI parses a flag with a value and forwards it to the extension', async () => {
    const dir = await makeConsumer();
    try {
        for (const flags of [['--name', 'carol'], ['--name=carol']]) {
            const { stdout, code } = await runNuckty(['greet', ...flags], dir);

            assert.equal(code, 7);
            assert.match(stdout, /hello CAROL/, 'value flag reaches the handler');
        }
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI --help still works when the consumer config cannot be loaded', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-nocfg-'));
    try {
        // No config/config-nuckty.ts at all — printHelp swallows the load error
        // and still shows the core usage.
        const { stdout, stderr, code } = await runNuckty(['--help'], dir);
        assert.equal(code, 0, 'help exits 0 even without a config');
        assert.match(stdout, /nuckty —/);
        assert.match(stdout, /build \[target\]/);
        // No extension commands listed (config/ext failed to load).
        assert.ok(!stdout.includes('greet'), 'no extension commands when config fails');
        assert.equal(stderr, '', 'help swallows the config error silently');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI --help works when a declared extension cannot be loaded', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-badext-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'c' }));
        // Config loads but references a missing extension.
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import { defineNucktyConfig } from '@nuckty/core';\n` +
            `export default defineNucktyConfig({\n` +
            `  targets: { default: { configDir: 'config/', outDir: 'site/' } },\n` +
            `  ext: ['./ext/does-not-exist.mjs'],\n` +
            `});\n`);
        await linkNuckty(dir);
        const { stdout, code } = await runNuckty(['--help'], dir);
        assert.equal(code, 0, 'help exits 0 even when an extension fails to load');
        assert.match(stdout, /nuckty —/);
        assert.match(stdout, /build \[target\]/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
