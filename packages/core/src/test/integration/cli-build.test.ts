/**
 * Full CLI build integration test — exercises the publishable artifact by
 * building `nuckty` (`npm run build`), then invoking the built CLI
 * `node <nuckty>/dist/bin/nuckty.js build` as a child process against an
 * isolated temporary consumer (config, content, blocks, bemdecl, CSS, JS,
 * images, a document-handler extension). Asserts observable relationships in
 * the on-disk output: HTML references the generated CSS/JS hashes, image
 * references resolve through `image-mapping.json`, `manifest.json` contains the
 * produced artifacts, Brotli/Gzip files decode to their originals, and the
 * nginx + `.htaccess` configs point to the generated HTML layout. A second
 * run verifies deterministic output and clean rebuilding of stale artifacts.
 *
 * This test does NOT call `runBuild`, individual stages, or private helpers —
 * it only spawns the built CLI and reads generated files from disk.
 *
 * @module test/cli-build
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
    mkdtemp, mkdir, writeFile, rm, readFile, access, readdir, copyFile,
} from 'node:fs/promises';
import { createUnzip, createBrotliDecompress } from 'node:zlib';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, symlinkSync } from 'node:fs';

const execFileAsync = promisify(execFile);

/** Absolute path to the built CLI: <project>/dist/bin/nuckty.js. */
const NUCKTY_BIN = fileURLToPath(new URL('../../../dist/bin/nuckty.js', import.meta.url));

/** Absolute path to the project root (for the nuckty package to link). */
const PROJECT_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/**
 * These tests exercise the built CLI (`dist/bin/nuckty.js`), so they require
 * `npm run build` to have run. The canonical `npm test` and `npm run
 * test:coverage` both build `dist` first; invoking a low-level runner without
 * building fails here with an actionable assertion rather than skipping.
 */
function assertBuildReady(): void {
    if (!existsSync(NUCKTY_BIN)) {
        throw new Error(
            `CLI build tests require the built artifact at ${NUCKTY_BIN}. ` +
                'Run `npm run build` (or `npm test`, which builds first) before running these tests.',
        );
    }
}

/** Spawn the built CLI with the given args in cwd, returning {stdout, stderr, code}. */
async function runNuckty(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
    assertBuildReady();
    try {
        const { stdout, stderr } = await execFileAsync(process.execPath, [NUCKTY_BIN, ...args], {
            cwd,
            env: { ...process.env, NODE_ENV: 'test' },
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
    try {
        // A real install would copy; a symlink is enough for the CLI's bare
        // `nuckty` specifier to resolve to the built dist.
        await symlinkOrCopy(PROJECT_ROOT, nmDir);
    } catch {
        // If symlinking fails (e.g. permissions), copy the dist directory.
        await mkdir(nmDir, { recursive: true });
        await copyFile(path.join(PROJECT_ROOT, 'package.json'), path.join(nmDir, 'package.json'));
        await mkdir(path.join(nmDir, 'dist'), { recursive: true });
        for (const f of ['index.js', 'index.js.map', 'index.d.ts']) {
            if (existsSync(path.join(PROJECT_ROOT, 'dist', f))) {
                await copyFile(path.join(PROJECT_ROOT, 'dist', f), path.join(nmDir, 'dist', f));
            }
        }
    }
}

async function symlinkOrCopy(target: string, link: string): Promise<void> {
    // Use the synchronous `symlinkSync` (with `type`): the promisified
    // `fs.promises.symlink` is mangled by the tsx loader under the test runner.
    // A symlink lets the consumer resolve nuckty AND nuckty's own deps.
    try {
        symlinkSync(target, link, 'dir');
        if (existsSync(path.join(link, 'package.json'))) {
            return;
        }
    } catch {
        // fall through to copy
    }
    await mkdir(link, { recursive: true });
}

/** Build the standard temp consumer used by the CLI build tests. */
async function makeConsumer(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-cli-build-'));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await mkdir(path.join(dir, 'content'), { recursive: true });
    await mkdir(path.join(dir, 'blocks', 'page'), { recursive: true });
    await mkdir(path.join(dir, 'ext'), { recursive: true });
    // NOTE: no `"type": "module"` — the bemdecl `.js` files use `module.exports`
    // (CJS), which Node treats as ESM under `"type": "module"`.
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'consumer' }));
    await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
        `import { defineNucktyConfig } from '@nuckty/core';\n` +
        `export default defineNucktyConfig({\n` +
        `  targets: { default: { configDir: 'config/', outDir: 'site/' } },\n` +
        `  ext: ['./ext/document.mjs'],\n` +
        `});\n`);
    await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
        baseUrl: 'https://example.com',
        rootTitle: 'Fixture',
        contentRepo: 'content',
        assetRepos: [],
        githubRawBase: null,
        bundles: ['page'],
    }));
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    await writeFile(path.join(dir, 'config', 'sitemap.yml'),
        'sitemap:\n  - Home [/, index.md]\n  - About [/about, about.md]\n');
    await writeFile(path.join(dir, 'content', 'index.md'),
        '# Home\n\nWelcome. ![logo](logo/logo.png)\n');
    await writeFile(path.join(dir, 'content', 'about.md'),
        '# About\n\nSee [Home](index.md).\n');
    // A 1x1 PNG fixture.
    const pngBytes = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600100000005000156fed98a0000000049454e44ae426082',
        'hex',
    );
    await mkdir(path.join(dir, 'content', 'logo'), { recursive: true });
    await writeFile(path.join(dir, 'content', 'logo', 'logo.png'), pngBytes);
    // A block with a bemdecl, a .nu.ts template, CSS, and JS.
    await writeFile(path.join(dir, 'blocks', 'page', 'page.bemdecl.js'),
        'module.exports = ["page"];\n');
    await writeFile(path.join(dir, 'blocks', 'page', 'page.nu.ts'),
        `import { block } from '@nuckty/core';\n` +
        `export default function templates() {\n` +
        `  block('page')({ tag: 'div' });\n` +
        `}\n`);
    await writeFile(path.join(dir, 'blocks', 'page', 'page.css'), '.page{color:red;width:max-content}\n');
    await writeFile(path.join(dir, 'blocks', 'page', 'page.js'), 'export const init = () => 1;\n');
    // A document-handler extension that renders the page tree into a full HTML
    // document and references the CSS/JS assets by their hash URLs.
    await writeFile(path.join(dir, 'ext', 'document.mjs'),
        `export function register(env) {\n` +
        `  env.document.register((data) => ({\n` +
        `    tag: 'html',\n` +
        `    content: [\n` +
        `      { tag: 'head', content: [\n` +
        `        { tag: 'title', content: data.page.title },\n` +
        `        ...Object.values(data.assets.css).map((c) => ({ tag: 'link', attrs: { rel: 'stylesheet', href: c.url } })),\n` +
        `        ...Object.values(data.assets.js).map((j) => ({ tag: 'script', attrs: { src: j.url, defer: true } })),\n` +
        `      ] },\n` +
        `      { tag: 'body', content: data.content },\n` +
        `    ],\n` +
        `  }));\n` +
        `}\n`);
    await linkNuckty(dir);
    return dir;
}

test('CLI build: full pipeline produces HTML, CSS, JS, images, manifest, and compressed artifacts', async () => {
    const dir = await makeConsumer();
    try {
        const { stdout, stderr, code } = await runNuckty(['build'], dir);
        assert.equal(code, 0, `build failed: ${stderr || stdout}`);
        assert.match(stdout, /built target "default"/);

        // --- CSS + JS hash files ---
        const hashCss = JSON.parse(await readFile(path.join(dir, '.build', 'hash-css.json'), 'utf8'));
        const hashJs = JSON.parse(await readFile(path.join(dir, '.build', 'hash-js.json'), 'utf8'));
        assert.ok(hashCss.page.hash, 'page CSS bundle hashed');
        assert.ok(hashJs.page.hash, 'page JS bundle hashed');
        const cssUrl = hashCss.page.url; // /<hash>.css
        const jsUrl = hashJs.page.url;

        // --- HTML references the generated CSS/JS hashes ---
        const homeHtml = await readFile(path.join(dir, 'site', 'html', 'index.html'), 'utf8');
        assert.ok(homeHtml.includes(`href=${cssUrl}`), 'HTML references the generated CSS hash URL');
        assert.ok(homeHtml.includes(`src=${jsUrl}`), 'HTML references the generated JS hash URL');

        // --- Image references resolve through image-mapping.json ---
        const imgMap = JSON.parse(await readFile(path.join(dir, '.build', 'image-mapping.json'), 'utf8'));
        assert.ok(imgMap['logo/logo.png'], 'logo mapped');
        const imgRef = imgMap['logo/logo.png'];
        assert.match(imgRef, /^_i[a-f0-9]{16}$/, 'raster image ref is _i<hash>');
        // The HTML inlines the image as <img src=/_i<hash>> (root-absolute).
        assert.ok(homeHtml.includes(`src=/${imgRef}`), 'HTML <img> uses the mapped image ref');

        // --- manifest.json contains the produced artifacts ---
        const manifest = JSON.parse(await readFile(path.join(dir, 'site', 'manifest.json'), 'utf8'));
        assert.ok(manifest['html/index.html'], 'manifest lists the HTML file');
        assert.ok(manifest['brotli/index.html.br'], 'manifest lists the brotli file');
        assert.ok(manifest['gzip/index.html.gz'], 'manifest lists the gzip file');
        assert.ok(!manifest['manifest.json'], 'manifest excludes itself');

        // --- Brotli + Gzip decode to their originals ---
        const brotliBuf = await readFile(path.join(dir, 'site', 'brotli', 'index.html.br'));
        const gzipBuf = await readFile(path.join(dir, 'site', 'gzip', 'index.html.gz'));
        const brotliDecoded = await decompressBrotli(brotliBuf);
        const gzipDecoded = await decompressGzip(gzipBuf);
        assert.equal(brotliDecoded, homeHtml, 'brotli decodes to the HTML original');
        assert.equal(gzipDecoded, homeHtml, 'gzip decodes to the HTML original');

        // --- .htaccess and nginx point to the generated HTML layout ---
        const htaccess = await readFile(path.join(dir, 'site', '.htaccess'), 'utf8');
        assert.match(htaccess, /DirectoryIndex index\.html/, '.htaccess sets DirectoryIndex');
        assert.match(htaccess, /html\/index\.html/, '.htaccess points to html/ layout');
        const nginx = await readFile(path.join(dir, '.build', 'nginx.conf'), 'utf8');
        assert.match(nginx, /html\//, 'nginx config references the html/ layout');

        // --- CSS/JS output files exist on disk ---
        const cssFiles = await readdir(path.join(dir, 'site', 'css'));
        assert.ok(cssFiles.some((f) => f === hashCss.page.filename), 'CSS file written under site/css/');
        const jsFiles = await readdir(path.join(dir, 'site', 'js'));
        assert.ok(jsFiles.some((f) => f === hashJs.page.filename), 'JS file written under site/js/');

        // --- Two pages were rendered (Home + About) ---
        await access(path.join(dir, 'site', 'html', 'about.html'));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build: a second run is deterministic — identical hashes and output bytes', async () => {
    const dir = await makeConsumer();
    try {
        const first = await runNuckty(['build'], dir);
        assert.equal(first.code, 0);
        const firstHashCss = JSON.parse(await readFile(path.join(dir, '.build', 'hash-css.json'), 'utf8'));
        const firstHome = await readFile(path.join(dir, 'site', 'html', 'index.html'), 'utf8');

        const second = await runNuckty(['build'], dir);
        assert.equal(second.code, 0);
        const secondHashCss = JSON.parse(await readFile(path.join(dir, '.build', 'hash-css.json'), 'utf8'));
        const secondHome = await readFile(path.join(dir, 'site', 'html', 'index.html'), 'utf8');

        assert.equal(secondHashCss.page.hash, firstHashCss.page.hash, 'CSS hash stable across runs');
        assert.equal(secondHome, firstHome, 'HTML byte-identical across runs');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build: a stale artifact is rebuilt cleanly (clean stage wipes output first)', async () => {
    const dir = await makeConsumer();
    try {
        const first = await runNuckty(['build'], dir);
        assert.equal(first.code, 0);
        // Drop a stale file into the output that the next build must remove.
        await writeFile(path.join(dir, 'site', 'stale.html'), 'should be removed');
        await writeFile(path.join(dir, '.build', 'stale.json'), '{}');

        const second = await runNuckty(['build'], dir);
        assert.equal(second.code, 0);
        await assert.rejects(() => access(path.join(dir, 'site', 'stale.html')), 'stale output file removed by clean stage');
        await assert.rejects(() => access(path.join(dir, '.build', 'stale.json')), 'stale build file removed by clean stage');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build: a missing document handler fails with a non-zero exit and an actionable message', async () => {
    const dir = await makeConsumer();
    try {
        // Remove the document-handler extension from the config.
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import { defineNucktyConfig } from '@nuckty/core';\n` +
            `export default defineNucktyConfig({\n` +
            `  targets: { default: { configDir: 'config/', outDir: 'site/' } },\n` +
            `});\n`);
        const { code, stderr } = await runNuckty(['build'], dir);
        assert.notEqual(code, 0, 'missing document handler exits non-zero');
        assert.match(stderr, /document handler/i, 'stderr names the document-handler problem');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build: an invalid block template export fails with a non-zero exit and an actionable message', async () => {
    const dir = await makeConsumer();
    try {
        // The block's .nu.ts has no default export — the deps loader rejects it.
        await writeFile(path.join(dir, 'blocks', 'page', 'page.nu.ts'),
            `export const notTemplates = () => 1;\n`);
        const { code, stderr } = await runNuckty(['build'], dir);
        assert.notEqual(code, 0, 'invalid block template export exits non-zero');
        assert.match(stderr, /template|default/i, 'stderr names the block template problem');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('CLI build: a broken Markdown link to an unknown .md file fails with a non-zero exit', async () => {
    const dir = await makeConsumer();
    try {
        await writeFile(path.join(dir, 'content', 'index.md'),
            '# Home\n\nSee [ghost](ghost.md).\n');
        const { code, stderr } = await runNuckty(['build'], dir);
        assert.notEqual(code, 0, 'broken markdown link exits non-zero');
        assert.match(stderr, /Unknown relative link|ghost/i, 'stderr names the unknown link target');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

/** Decompress a Brotli buffer to a UTF-8 string. */
function decompressBrotli(buf: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        createBrotliDecompress().end(buf)
            .on('data', (c: Buffer) => chunks.push(c))
            .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            .on('error', reject);
    });
}

/** Decompress a Gzip buffer to a UTF-8 string. */
function decompressGzip(buf: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        createUnzip().end(buf)
            .on('data', (c: Buffer) => chunks.push(c))
            .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            .on('error', reject);
    });
}

test('CLI build: typeless consumer config with a TS helper uses the loader without warnings', async () => {
    const dir = await makeConsumer();
    try {
        await writeFile(path.join(dir, 'config', 'helper.ts'), `export const output: string = 'site';\n`);
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `import { output } from './helper.js';\nexport default {targets:{default:{configDir:'config',outDir:output}},ext:['./ext/document.mjs']};\n`);
        const { code, stderr } = await runNuckty(['build'], dir);
        assert.equal(code, 0, stderr);
        assert.equal(stderr, '', 'TypeScript config and helper must not fall through to Node syntax detection');
        assert.ok(existsSync(path.join(dir, 'site', 'html', 'index.html')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
