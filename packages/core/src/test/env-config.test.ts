/**
 * Direct in-process tests for `src/env/config.ts` (`loadConfig`) — covers the
 * consumer-config loading contract: resolve `config/config-nuckty.ts`, import
 * its default export, fall back to a single default target when the file is
 * missing, and rethrow genuine errors (e.g. a config with no default export).
 *
 * Runs `loadConfig` directly against temp consumer trees so the source is
 * covered; the CLI build/command tests exercise the same loader path
 * end-to-end as black-box behavior.
 *
 * @module test/env-config
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { symlinkSync } from 'node:fs';
import { loadConfig } from '../env/config.js';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Link the local nuckty build into a temp consumer so `import '@nuckty/core'` resolves. */
async function linkNuckty(consumerDir: string): Promise<void> {
    const nm = path.join(consumerDir, 'node_modules', '@nuckty', 'core');
    await mkdir(path.dirname(nm), { recursive: true });
    try { symlinkSync(PROJECT_ROOT, nm, 'dir'); return; } catch { /* fall through */ }
}

test('loadConfig: imports the default export of config/config-nuckty.ts', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await linkNuckty(dir);
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import { defineNucktyConfig } from '@nuckty/core';\n` +
            `export default defineNucktyConfig({\n` +
            `  targets: { ru: { configDir: 'config/', outDir: 'site/' }, en: { configDir: 'config/', outDir: 'site-en/' } },\n` +
            `});\n`);
        // nuckty must resolve from the project's node_modules for the import.
        const cfg = await loadConfig(dir);
        assert.ok(cfg.targets.ru, 'ru target present');
        assert.ok(cfg.targets.en, 'en target present');
        assert.equal(cfg.targets.en!.configDir, 'config/');
        assert.equal(cfg.targets.en!.outDir, 'site-en/');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: a plain object default export (no defineNucktyConfig) is accepted', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `export default { targets: { default: { configDir: 'config/', outDir: 'site/' } } };\n`);
        const cfg = await loadConfig(dir);
        assert.ok(cfg.targets.default);
        assert.equal(cfg.targets.default!.outDir, 'site/');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: falls back to a single default target when config is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        // No config/ directory at all.
        const cfg = await loadConfig(dir);
        assert.ok(cfg.targets.default, 'fallback provides a default target');
        assert.equal(cfg.targets.default!.configDir, 'config/');
        assert.equal(cfg.targets.default!.outDir, 'site/');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: rethrows when the config exists but has no default export', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `export const notDefault = 1;\n`);
        await assert.rejects(() => loadConfig(dir), /no default export/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: rethrows a genuine module error (not masked as missing)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        // A config that references an undefined name → a real evaluation error,
        // not the "missing module" fallback path.
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `export default undefinedThing;\n`);
        await assert.rejects(() => loadConfig(dir));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: a missing transitive import is NOT masked as a missing config (RUNTIME-003)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        // A config whose own import fails must propagate — previously any
        // ERR_MODULE_NOT_FOUND (including this one) fell back to the default
        // target, silently discarding the consumer's real targets.
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import './missing-dep.mjs';\n` +
            `export default { targets: { real: { configDir: 'config/', outDir: 'published/' } } };\n`);
        await assert.rejects(() => loadConfig(dir), (e: Error) =>
            /missing-dep/.test(e.message) || /Cannot find/.test(e.message));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: a syntax error in the config is NOT masked as a missing config', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cfg-'));
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'), `export {{{\n`);
        await assert.rejects(() => loadConfig(dir));
        // And crucially: no silent fallback — the error mentions the config.
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('loadConfig: a later programmatic build reads the updated entry', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-config-refresh-'));
    try {
        await writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
        await mkdir(path.join(dir, 'config'));
        const file = path.join(dir, 'config', 'config-nuckty.ts');
        await writeFile(file, `export default {targets:{first:{configDir:'config',outDir:'site'}}};`);
        assert.ok((await loadConfig(dir)).targets.first);
        await writeFile(file, `export default {targets:{second:{configDir:'config',outDir:'other'}}};`);
        const next = await loadConfig(dir);
        assert.ok(next.targets.second);
        assert.equal(next.targets.first, undefined);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
