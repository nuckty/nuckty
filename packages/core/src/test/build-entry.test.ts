/**
 * Direct in-process tests for `src/build.ts` (`runBuild`) — covers the build
 * entry point (config load → resolve target(s) → load extensions → register
 * stages → run pipeline → emit) without spawning a child process. Runs
 * `runBuild` against an isolated temp consumer so the source lines of
 * `build.ts` are exercised under coverage; the CLI build/command tests cover
 * the same entry point end-to-end as black-box child-process behavior.
 *
 * @module test/build-entry
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { symlinkSync } from 'node:fs';
import { runBuild } from './helpers/build.js';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Link the local nuckty build into a temp consumer so `import '@nuckty/core'` resolves. */
async function linkNuckty(consumerDir: string): Promise<void> {
    const nm = path.join(consumerDir, 'node_modules', '@nuckty', 'core');
    await mkdir(path.dirname(nm), { recursive: true });
    try { symlinkSync(PROJECT_ROOT, nm, 'dir'); return; } catch { /* fall through */ }
}

/** Build a temp consumer with one target, content, a block, and a document handler. */
async function makeConsumer(opts: { secondTarget?: boolean } = {}): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-build-entry-'));
    await linkNuckty(dir);
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await mkdir(path.join(dir, 'content'), { recursive: true });
    await mkdir(path.join(dir, 'blocks', 'page'), { recursive: true });
    await mkdir(path.join(dir, 'ext'), { recursive: true });
    // No "type": "module" — bemdecl .js uses module.exports (CJS).
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'consumer' }));
    const targets = opts.secondTarget
        ? `default: { configDir: 'config/', outDir: 'site/' }, extra: { configDir: 'config/', outDir: 'site-extra/' }`
        : `default: { configDir: 'config/', outDir: 'site/' }`;
    await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
        `import { defineNucktyConfig } from '@nuckty/core';\n` +
        `export default defineNucktyConfig({\n` +
        `  targets: { ${targets} },\n` +
        `  ext: ['./ext/doc.mjs'],\n` +
        `});\n`);
    await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
        baseUrl: 'https://example.com', rootTitle: 'Fixture',
        githubRawBase: null, bundles: ['page'],
    }));
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    await writeFile(path.join(dir, 'config', 'sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n');
    await writeFile(path.join(dir, 'content', 'index.md'), '# Home\n\nWelcome.\n');
    await writeFile(path.join(dir, 'blocks', 'page', 'page.bemdecl.js'), 'module.exports = ["page"];\n');
    await writeFile(path.join(dir, 'blocks', 'page', 'page.nu.ts'),
        `import { block } from '@nuckty/core';\nexport default function templates() { block('page')({ tag: 'div' }); }\n`);
    await writeFile(path.join(dir, 'blocks', 'page', 'page.css'), '.page{color:red}\n');
    await writeFile(path.join(dir, 'ext', 'doc.mjs'),
        `export function register(env) {\n` +
        `  env.document.register((data) => ({ tag: 'html', content: [{ tag: 'body', content: data.content }] }));\n` +
        `}\n`);
    return dir;
}

test('runBuild: builds the default target in-process and writes site/html/index.html', async () => {
    const dir = await makeConsumer();
    try {
        await runBuild({ command: 'build', cwd: dir });
        const html = await readFile(path.join(dir, 'site', 'html', 'index.html'), 'utf8');
        assert.match(html, /<h1[^>]*>/, 'heading rendered');
        assert.match(html, /Home/, 'page title content present');
        assert.ok(await exists(path.join(dir, 'site', 'manifest.json')), 'manifest written');
        assert.ok(await exists(path.join(dir, '.build', 'sitemap.json')), 'sitemap artifact written');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild: builds a named target when target is specified', async () => {
    const dir = await makeConsumer({ secondTarget: true });
    try {
        await runBuild({ command: 'build', target: 'extra', cwd: dir });
        assert.ok(await exists(path.join(dir, 'site-extra', 'html', 'index.html')), 'named target output written');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild: builds all targets when no target is specified', async () => {
    const dir = await makeConsumer({ secondTarget: true });
    try {
        await runBuild({ command: 'build', cwd: dir });
        assert.ok(await exists(path.join(dir, 'site', 'html', 'index.html')), 'default target built');
        assert.ok(await exists(path.join(dir, 'site-extra', 'html', 'index.html')), 'extra target built');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild: throws on an unknown target name', async () => {
    const dir = await makeConsumer();
    try {
        await assert.rejects(() => runBuild({ command: 'build', target: 'ghost', cwd: dir }), /unknown target "ghost"/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild: a missing document handler rejects with an actionable message', async () => {
    const dir = await makeConsumer();
    try {
        // Remove the document extension from the config.
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import { defineNucktyConfig } from '@nuckty/core';\n` +
            `export default defineNucktyConfig({ targets: { default: { configDir: 'config/', outDir: 'site/' } } });\n`);
        await assert.rejects(() => runBuild({ command: 'build', cwd: dir }), /document handler/i);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

/** Promise-based exists check. */
async function exists(p: string): Promise<boolean> {
    try { await access(p); return true; } catch { return false; }
}

import { createHash } from 'node:crypto';
import { symlink } from 'node:fs/promises';

/** Source-only consumer: no compiled package or external content is needed. */
async function makeSourceConsumer(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-source-build-'));
    await mkdir(path.join(dir, 'config'));
    await writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(dir, 'document.mjs'), 'export default env => env.document.register(data => ({tag:"html",content:data.content}));');
    return dir;
}

async function targetFiles(dir: string, configDir: string, contentDir: string, title: string): Promise<void> {
    await mkdir(path.join(dir, configDir), { recursive: true });
    await mkdir(path.join(dir, contentDir), { recursive: true });
    await writeFile(path.join(dir, configDir, 'site.json'), JSON.stringify({ bundles: [], logPrefix: title }));
    await writeFile(path.join(dir, configDir, 'levels.json'), JSON.stringify([contentDir]));
    await writeFile(path.join(dir, configDir, 'sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n');
    await writeFile(path.join(dir, contentDir, 'index.md'), `# ${title}\n`);
}

test('runBuild: custom config, content and symlink aliases are rejected before clean', async () => {
    for (const scenario of ['config', 'content', 'alias']) {
        const dir = await makeSourceConsumer();
        try {
            await targetFiles(dir, 'custom-config', 'custom-content', 'keep');
            const inputDir = scenario === 'config' ? 'custom-config' : 'custom-content';
            await writeFile(path.join(dir, inputDir, 'sentinel'), 'keep');
            let outDir = inputDir;
            if (scenario === 'alias') {
                await symlink(dir, path.join(dir, 'alias'));
                outDir = `alias/${inputDir}`;
            }
            await writeFile(path.join(dir, 'config/config-nuckty.ts'), `export default ${JSON.stringify({
                targets: { default: { configDir: 'custom-config', outDir } }, ext: ['./document.mjs'],
            })};`);
            await assert.rejects(runBuild({ cwd: dir, command: 'build' }), /overlaps/);
            assert.equal(await readFile(path.join(dir, inputDir, 'sentinel'), 'utf8'), 'keep');
            assert.equal(await exists(path.join(dir, '.build')), false);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    }
});

test('runBuild: sibling outputs use target content and refresh snapshots between builds', async () => {
    const dir = await makeSourceConsumer();
    try {
        await targetFiles(dir, 'config', 'wrong-content', 'Wrong');
        await targetFiles(dir, 'config-ru', 'content-ru', 'Russian');
        await targetFiles(dir, 'config-en', 'content-en', 'English');
        await writeFile(path.join(dir, 'config/config-nuckty.ts'), `export default ${JSON.stringify({
            targets: { ru: { configDir: 'config-ru', outDir: 'dist/ru' }, en: { configDir: 'config-en', outDir: 'dist/en' } },
            ext: ['./document.mjs'],
        })};`);
        await runBuild({ cwd: dir, command: 'build' });
        const ru = await readFile(path.join(dir, 'dist/ru/html/index.html'), 'utf8');
        const en = await readFile(path.join(dir, 'dist/en/html/index.html'), 'utf8');
        assert.match(ru, /Russian/);
        assert.doesNotMatch(ru, /English|Wrong/);
        assert.match(en, /English/);
        assert.doesNotMatch(en, /Russian|Wrong/);
        assert.match(await readFile(path.join(dir, '.build/nginx.conf'), 'utf8'), /English_access/);
        await targetFiles(dir, 'config-en', 'changed-content', 'Changed');
        await runBuild({ cwd: dir, command: 'build', target: 'en' });
        assert.match(await readFile(path.join(dir, 'dist/en/html/index.html'), 'utf8'), /Changed/);
        assert.match(await readFile(path.join(dir, '.build/nginx.conf'), 'utf8'), /Changed_access/);
        assert.equal(await readFile(path.join(dir, 'dist/ru/html/index.html'), 'utf8'), ru);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild: hosting hooks modify generated config before manifest, after extension emit', async () => {
    const dir = await makeSourceConsumer();
    try {
        await targetFiles(dir, 'config', 'content', 'Home');
        await writeFile(path.join(dir, 'hosting.mjs'), `import fs from 'node:fs/promises'; import path from 'node:path';
export default function(env) {
    env.pipeline.registerStage('extra', async ctx => fs.writeFile(path.join(ctx.outDir, 'extra.txt'), 'extra artifact'), {phase:'emit'});
    env.pipeline.after('htaccess', async ctx => fs.appendFile(path.join(ctx.outDir, '.htaccess'), '\\nRewriteRule ^adb$ /common/adb [R=302,L]\\n'));
}`);
        await writeFile(path.join(dir, 'config/config-nuckty.ts'), `export default {targets:{default:{configDir:'config',outDir:'site'}},ext:['./document.mjs','./hosting.mjs']};`);
        await runBuild({ cwd: dir, command: 'build' });
        const bytes = await readFile(path.join(dir, 'site/.htaccess'));
        assert.match(bytes.toString(), /RewriteRule \^adb\$/);
        const manifest = JSON.parse(await readFile(path.join(dir, 'site/manifest.json'), 'utf8')) as Record<string, { hash: string; size: number }>;
        assert.deepEqual(manifest['.htaccess'], { hash: createHash('md5').update(bytes).digest('hex').slice(0, 16), size: bytes.length });
        assert.ok(manifest['extra.txt']);
        assert.ok(manifest['brotli/extra.txt.br']);
        assert.ok(manifest['gzip/extra.txt.gz']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild rejects an empty loaded target set before cleanup', async () => {
    const dir = await makeConsumer();

    try {
        await mkdir(path.join(dir, 'site'));
        await writeFile(path.join(dir, 'site/keep.txt'), 'KEEP');
        await writeFile(path.join(dir, 'config/config-nuckty.ts'), "import { defineNucktyConfig } from '@nuckty/core'; const config = defineNucktyConfig({targets:{main:{configDir:'config',outDir:'site'}}}); config.targets = {}; export default config;");
        await assert.rejects(runBuild({ command: 'build', cwd: dir }), /requires at least one target/);
        assert.equal(await readFile(path.join(dir, 'site/keep.txt'), 'utf8'), 'KEEP');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
