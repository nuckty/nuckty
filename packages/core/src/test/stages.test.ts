import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Pipeline, type BuildContext } from '../pipeline/pipeline.js';
import { Templates } from '../bem/templates.js';
import { NucktyEnv } from '../env/env.js';
import { registerDefaultStages, cleanStage } from '../stages/index.js';
import { sitemapStage, parseSitemapLine, parseIndentedSitemap, buildFullUrl, processSitemap } from '../stages/sitemap.js';
import { jsStage } from '../stages/js.js';
import { imagesStage } from '../stages/images.js';
import { assetsStage } from '../stages/assets.js';
import { compressionStage } from '../stages/compression.js';
import { manifestStage } from '../stages/manifest.js';
import { htaccessStage, generateHtaccess } from '../stages/htaccess.js';
import { nginxStage } from '../stages/nginx.js';
import { generateHash } from '../utils/hash.js';

/** Build a fake project tree in a temp dir and return a BuildContext for it. */
async function makeProject(): Promise<{ ctx: BuildContext; dir: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-stage-'));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await writeFile(path.join(dir, 'config/site.json'), '{"bundles":[]}');
    const ctx: BuildContext = {
        cwd: dir,
        configDir: path.join(dir, 'config'),
        buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'),
        target: 'default',
        env: new NucktyEnv(),
        templates: new Templates(),
        store: {},
        cache: new Map(),
    };
    return { ctx, dir };
}

test('parseSitemapLine parses Name [url, file.md, { layout }]', () => {
    const parsed = parseSitemapLine('Nuckty [/, index.md, { layout: "blocks/page/page.njk" }]');
    assert.ok(parsed);
    assert.equal(parsed!.title, 'Nuckty');
    assert.equal(parsed!.url, '/');
    assert.equal(parsed!.file, 'index.md');
    assert.equal(parsed!.meta['layout'], 'blocks/page/page.njk');
});

test('parseSitemapLine parses a line without meta', () => {
    const parsed = parseSitemapLine('About [/about, about.md]');
    assert.ok(parsed);
    assert.equal(parsed!.title, 'About');
    assert.equal(parsed!.file, 'about.md');
    assert.deepEqual(parsed!.meta, {});
});

test('parseSitemapLine returns null for an invalid line', () => {
    assert.equal(parseSitemapLine('just a title'), null);
});

test('buildFullUrl: absolute url returned as-is', () => {
    assert.equal(buildFullUrl('/free', '/about'), '/about');
});

test('buildFullUrl: relative url joined to parent', () => {
    assert.equal(buildFullUrl('/free', 'models'), '/free/models');
    assert.equal(buildFullUrl('/free/', 'models'), '/free/models');
});

test('parseIndentedSitemap builds nested structure', () => {
    const yml = [
        'sitemap:',
        '  - Root [/, index.md]',
        '  - Section [/section, section.md]',
        '    - Child [/section/child, child.md]',
    ].join('\n');
    const result = parseIndentedSitemap(yml);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'Root [/, index.md]');
    // Section has children → object form.
    const section = result[1] as Record<string, unknown[]>;
    assert.ok(section);
    const sectionKey = Object.keys(section)[0]!;
    assert.ok(sectionKey.startsWith('Section'));
    assert.equal(section[sectionKey]!.length, 1);
    assert.equal(section[sectionKey]![0], 'Child [/section/child, child.md]');
});

test('processSitemap builds pages, breadcrumbs, title suffix, and md maps', () => {
    const items = parseIndentedSitemap([
        'sitemap:',
        '  - Nuckty [/, index.md]',
        '  - Free [/free, free.md]',
        '    - Models [/free/models, models.md]',
    ].join('\n'));
    const result = processSitemap(items);
    // Pages keyed by absolute URL.
    assert.ok(result.pages['/']);
    assert.ok(result.pages['/free']);
    assert.ok(result.pages['/free/models']);
    // Breadcrumbs.
    assert.deepEqual(result.pages['/free/models']!.breadcrumbs, ['/free']);
    // md2url / url2md.
    assert.equal(result.md2url['models.md'], '/free/models');
    assert.equal(result.url2md['/free/models'], 'models.md');
    // md2urls (shared-file list).
    assert.ok(Array.isArray(result.md2urls['models.md']));
    // Title suffix: non-root pages get the root title appended.
    assert.ok(result.pages['/free']!.title.includes('Nuckty'));
});

test('sitemap stage parses a real sitemap.yml and renders markdown to a tree', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'content'), { recursive: true });
        await mkdir(path.join(dir, 'blocks'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'sitemap.yml'),
            'sitemap:\n  - Nuckty [/, index.md, { layout: "blocks/page/page.njk" }]\n');
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://example.com',
            rootTitle: 'Nuckty',
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await writeFile(path.join(dir, 'content', 'index.md'), '# Hello\n\nWorld.\n');

        await sitemapStage(ctx);

        const sitemap = ctx.store['sitemap'] as {
            pages: Record<string, { tree: unknown; headings: unknown[]; layout?: string }>;
        };
        assert.ok(sitemap, 'sitemap artifact should be stored');
        const root = sitemap.pages['/'];
        assert.ok(root, 'root page present');
        assert.ok(Array.isArray(root.tree), 'page has a rendered BemNode tree');
        assert.ok(Array.isArray(root.headings), 'page has headings');
        assert.equal(root.headings!.length, 1);
        assert.equal(root.layout, 'blocks/page/page.njk');
        // .build/sitemap.json written.
        const written = JSON.parse(await readFile(path.join(ctx.buildDir, 'sitemap.json'), 'utf8'));
        assert.ok(written.pages['/']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('sitemap stage fails the build on a link to an unknown .md file', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'content'), { recursive: true });
        await mkdir(path.join(dir, 'blocks'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'sitemap.yml'),
            'sitemap:\n  - Nuckty [/, index.md]\n');
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://example.com',
            rootTitle: 'Nuckty',
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await writeFile(path.join(dir, 'content', 'index.md'), '# Hello\n\nSee [ghost](ghost.md).\n');

        await assert.rejects(
            async () => await sitemapStage(ctx),
            /Unknown relative link/,
        );
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('generateHash is deterministic 16-hex', () => {
    const a = generateHash('hello');
    const b = generateHash('hello');
    assert.equal(a, b);
    assert.equal(a.length, 16);
    assert.match(a, /^[a-f0-9]{16}$/);
});

test('generateHash handles buffers', () => {
    const a = generateHash('hello');
    const b = generateHash(Buffer.from('hello'));
    assert.equal(a, b);
});

test('images stage hashes + copies images and writes image-mapping.json', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await mkdir(path.join(dir, 'content', 'logo'), { recursive: true });
        await mkdir(path.join(dir, 'blocks'), { recursive: true });
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
        // A 1x1 PNG (8-byte signature + minimal IHDR/IDAT) — reuse a tiny real PNG.
        const pngBytes = Buffer.from(
            '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600100000005000156fed98a0000000049454e44ae426082',
            'hex',
        );
        await writeFile(path.join(dir, 'content', 'logo', 'logo.png'), pngBytes);

        await imagesStage(ctx);

        const mapping = ctx.store['imageMapping'] as Record<string, string>;
        assert.ok(mapping);
        assert.ok(mapping['logo/logo.png']);
        // Raster refs use the _i<hash> form.
        assert.match(mapping['logo/logo.png'], /^_i[a-f0-9]{16}$/);
        // Physical file copied into site/png/<hash>.png.
        const stats = ctx.store['imageStats'] as Record<string, { ref: string; format: string }>;
        assert.ok(stats);
        const hashedKey = Object.keys(stats).find((k) => k.endsWith('.png'));
        assert.ok(hashedKey);
        assert.equal(stats[hashedKey!]!.format, 'png');
        // image-mapping.json persisted.
        const written = JSON.parse(await readFile(path.join(ctx.buildDir, 'image-mapping.json'), 'utf8'));
        assert.ok(written['logo/logo.png']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assets stage copies static config files from config/', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://example.com',
            rootTitle: 'X',
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        await writeFile(path.join(dir, 'config', 'robots.txt'), 'User-agent: *\nDisallow:\n');
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));

        await assetsStage(ctx);

        const robots = await readFile(path.join(ctx.outDir, 'robots.txt'), 'utf8');
        assert.match(robots, /User-agent/);
        const repos = ctx.store['assetRepos'] as { available: string[]; missing: string[] };
        assert.ok(repos);
        // content repo dir doesn't exist under external/, so it's skipped.
        assert.ok(!repos.available.includes('content'));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('compression stage writes brotli + gzip for compressible files (skips empty)', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(ctx.outDir, 'css'), { recursive: true });
        await writeFile(path.join(ctx.outDir, 'css', 'a.css'), 'body{color:red}');
        await writeFile(path.join(ctx.outDir, 'empty.css'), '');
        await compressionStage(ctx);

        const brotli = await readFile(path.join(ctx.outDir, 'brotli', 'a.css.br'));
        const gzip = await readFile(path.join(ctx.outDir, 'gzip', 'a.css.gz'));
        assert.ok(brotli.length > 0);
        assert.ok(gzip.length > 0);
        // gzip OS byte normalized to 0xFF.
        assert.equal(gzip[9], 0xff);
        // empty.css skipped — no compressed artifact.
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'brotli', 'empty.css.br')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('manifest stage writes sorted manifest.json excluding itself', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(ctx.outDir, { recursive: true });
        await writeFile(path.join(ctx.outDir, 'a.css'), 'aaa');
        await writeFile(path.join(ctx.outDir, 'b.js'), 'bb');
        await manifestStage(ctx);

        const manifest = JSON.parse(await readFile(path.join(ctx.outDir, 'manifest.json'), 'utf8'));
        const keys = Object.keys(manifest);
        assert.deepEqual(keys, [...keys].sort());
        assert.ok(!keys.includes('manifest.json'));
        assert.ok(keys.includes('a.css'));
        assert.ok(keys.includes('b.js'));
        assert.equal(typeof manifest['a.css']!.hash, 'string');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('registerDefaultStages registers content stages by phase and finalizers separately', () => {
    const p = new Pipeline();
    registerDefaultStages(p);
    assert.deepEqual(p.stageNames(), ['clean', 'images', 'assets', 'sitemap', 'css', 'js', 'resolve', 'html']);
});

test('finalizers run after the pipeline: an extension emit file reaches compression and manifest', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({ bundles: [] }));
        await writeFile(path.join(dir, 'config', 'sitemap.yml'), 'sitemap: []\n');
        const p = new Pipeline();
        registerDefaultStages(p);
        ctx.store['blockDeps'] = {};
        ctx.env.levels.add('blocks');
        // An extension-style emit stage writing an extra artifact file.
        p.registerStage('search', async (c) => {
            await writeFile(path.join(c.outDir, 'search.txt'), 'findable content');
        }, { phase: 'emit' });
        await p.run(ctx);
        await p.finalize(ctx);
        const manifest = JSON.parse(await readFile(path.join(ctx.outDir, 'manifest.json'), 'utf8')) as Record<string, unknown>;
        assert.ok('search.txt' in manifest, 'extension emit file must be listed in the manifest');
        assert.ok(existsSync(path.join(ctx.outDir, 'gzip', 'search.txt.gz')), 'extension emit file must be compressed');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('clean stage removes and recreates build + out dirs', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(ctx.buildDir, { recursive: true });
        await mkdir(ctx.outDir, { recursive: true });
        await writeFile(path.join(ctx.buildDir, 'old.json'), '{}');
        await writeFile(path.join(ctx.outDir, 'old.html'), '<html/>');
        await cleanStage(ctx);
        // old files gone, dirs recreated.
        await assert.rejects(() => readFile(path.join(ctx.buildDir, 'old.json')));
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'old.html')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('generateHtaccess produces br+gz config without zstd and without user redirects', () => {
    const content = generateHtaccess();
    // Core directives present.
    assert.match(content, /DirectoryIndex index\.html/);
    assert.match(content, /RewriteEngine On/);
    // Trailing slash 301.
    assert.match(content, /RewriteRule \^\(\.\+\)\/\$ \/\$1 \[R=301,L\]/);
    // Image negotiation AVIF → WebP → PNG → JPG → SVG.
    assert.match(content, /image\/avif/);
    assert.match(content, /image\/webp/);
    assert.match(content, /png\/\$1\.png/);
    assert.match(content, /jpg\/\$1\.jpg/);
    assert.match(content, /svg\/\$1\.svg/);
    // Compression negotiation: brotli and gzip only.
    assert.match(content, /RewriteCond %\{HTTP:Accept-Encoding\} .*br/);
    assert.match(content, /RewriteCond %\{HTTP:Accept-Encoding\} .*gzip/);
    // NO zstd anywhere.
    assert.equal(content.indexOf('zstd'), -1);
    assert.equal(content.indexOf('.zst'), -1);
    // NO consumer redirects (Redirect 301).
    assert.equal(content.indexOf('Redirect 301'), -1);
    // Sitemap handling.
    assert.match(content, /sitemap\\.xml/);
    // Flat URL mapping 1-5 levels (brotli variant). Flags like [L,E=IS_HTML:1]
    // trail each rule, so match the rule prefix, not end-of-line. Brackets in
    // the RewriteRule pattern ([^/]) are escaped as literals.
    assert.match(content, /RewriteRule \^\(\[\^\/\]\+\)\$ brotli\/\$1\.html\.br /);
    assert.match(content, /RewriteRule \^\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\$ brotli\//);
    // Uncompressed fallbacks serve from html/ (mirrors nginx; uncompressed
    // pages live in html/, flat copies only exist compressed) — root + 1-5
    // levels must not reference DOCUMENT_ROOT/<flat>.html.
    assert.match(content, /RewriteCond %\{DOCUMENT_ROOT\}\/html\/index\.html -f/);
    assert.match(content, /RewriteRule \^\(\[\^\/\]\+\)\$ html\/\$1\.html /);
    assert.match(content, /RewriteRule \^\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\/\(\[\^\/\]\+\)\$ html\//);
    assert.equal(content.indexOf('DOCUMENT_ROOT}/index.html -f'), -1);
    assert.equal(content.indexOf('DOCUMENT_ROOT}/$1.html -f'), -1);
    // FilesMatch for Content-Encoding br and gzip.
    assert.match(content, /Content-Encoding "br"/);
    assert.match(content, /Content-Encoding "gzip"/);
    // Vary Accept-Encoding.
    assert.match(content, /Vary "Accept-Encoding"/);
    // Security headers for HTML.
    assert.match(content, /X-Frame-Options "SAMEORIGIN"/);
    assert.match(content, /X-Content-Type-Options "nosniff"/);
    assert.match(content, /Referrer-Policy "strict-origin-when-cross-origin"/);
    // Cache-Control: HTML no-cache, hashed immutable.
    assert.match(content, /Cache-Control "public,no-cache"/);
    assert.match(content, /Cache-Control "public,immutable"/);
    // ExpiresActive.
    assert.match(content, /ExpiresActive On/);
});

test('htaccess stage writes .htaccess to outDir', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(ctx.outDir, { recursive: true });
        await htaccessStage(ctx);
        const content = await readFile(path.join(ctx.outDir, '.htaccess'), 'utf8');
        assert.match(content, /DirectoryIndex index\.html/);
        assert.match(content, /RewriteEngine On/);
        // No zstd.
        assert.equal(content.indexOf('zstd'), -1);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('js stage bundles declared blocks, hashes, and writes site/js/<hash>.js', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await mkdir(path.join(dir, 'blocks', 'page'), { recursive: true });
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://example.com',
            rootTitle: 'Nuckty',
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['blocks']));
        ctx.env.levels.add('blocks');
        // A block JS entry the deps loader would have declared.
        await writeFile(path.join(dir, 'blocks', 'page', 'page.js'), 'export const page = () => 1;\n');

        // Seed the deps the js stage reads: blockDeps + levels (a real build does
        // this via the deps loader).
        ctx.store['blockDeps'] = { page: ['page'] };
        ctx.env.levels.add('blocks');

        await jsStage(ctx);

        const jsHash = ctx.store['jsHash'] as Record<string, { hash: string; filename: string; url: string; source: string[] }>;
        assert.ok(jsHash.page, 'page bundle hashed');
        assert.match(jsHash.page!.hash, /^[a-f0-9]{16}$/);
        assert.equal(jsHash.page!.filename, `${jsHash.page!.hash}.js`);
        assert.equal(jsHash.page!.url, `/${jsHash.page!.hash}.js`);
        // The hashed bundle is written under site/js/.
        const written = await readFile(path.join(ctx.outDir, 'js', jsHash.page!.filename), 'utf8');
        // esbuild IIFE-minified: an IIFE wrapper around the bundled code.
        assert.ok(written.length > 0);
        assert.ok(!written.includes('export '), 'esbuild IIFE minify drops the export');
        // hash-js.json persisted with the bundle entry.
        const hashFile = JSON.parse(await readFile(path.join(ctx.buildDir, 'hash-js.json'), 'utf8'));
        assert.equal(hashFile.page.hash, jsHash.page!.hash);
        assert.deepEqual(hashFile.page.source, ['blocks/page/page.js']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('js stage writes an empty entry for a bundle with no JS files', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://example.com',
            rootTitle: 'Nuckty',
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['blocks']));
        ctx.env.levels.add('blocks');
        // blockDeps declares a block, but no .js file exists on disk.
        ctx.store['blockDeps'] = { page: ['page'] };
        ctx.env.levels.add('blocks');

        await jsStage(ctx);

        // No real hash entry in the store (only bundles with output go there)…
        const jsHash = ctx.store['jsHash'] as Record<string, unknown> | undefined;
        assert.ok(!jsHash || !jsHash.page);
        // …but an empty placeholder is written to hash-js.json (1:1 with the original).
        const hashFile = JSON.parse(await readFile(path.join(ctx.buildDir, 'hash-js.json'), 'utf8'));
        assert.equal(hashFile.page.hash, 'empty');
        assert.equal(hashFile.page.url, '/empty.js');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('js stage FAILS the build on a bundling error instead of silently skipping (STAGE-01)', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'blocks', 'broken'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({ bundles: ['page'] }));
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['blocks']));
        ctx.env.levels.add('blocks');
        await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
        // A block with a syntax error — esbuild must reject, the stage must throw.
        await writeFile(path.join(dir, 'blocks', 'broken', 'broken.js'), 'function {{{\n');
        ctx.store['blockDeps'] = { page: ['broken'] };

        await assert.rejects(
            async () => await jsStage(ctx),
            /bundling "page" failed/,
            'a broken block JS must fail the build, not produce a JS-less "success"',
        );
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('compression rejects duplicate basenames before writing compressed bytes', async () => {
    const { ctx, dir } = await makeProject();
    try {
        for (const name of ['a', 'b']) {
            await mkdir(path.join(ctx.outDir, name), { recursive: true });
            await writeFile(path.join(ctx.outDir, name, 'x.txt'), name);
        }
        await assert.rejects(async () => await compressionStage(ctx), /collision.*a\/x.txt.*b\/x.txt/);
        assert.equal(existsSync(path.join(ctx.outDir, 'gzip', 'x.txt.gz')), false);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('manifest hashes PDF tails and retains prototype-like filenames', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(ctx.outDir, { recursive: true });
        const file = path.join(ctx.outDir, 'book.pdf');
        await writeFile(file, 'X'.repeat(1024) + 'AAA');
        await writeFile(path.join(ctx.outDir, '__proto__'), 'file');
        await manifestStage(ctx);
        const first = JSON.parse(await readFile(path.join(ctx.outDir, 'manifest.json'), 'utf8'));
        assert.equal(Object.hasOwn(first, '__proto__'), true);
        await writeFile(file, 'X'.repeat(1024) + 'BBB');
        await manifestStage(ctx);
        const second = JSON.parse(await readFile(path.join(ctx.outDir, 'manifest.json'), 'utf8'));
        assert.notEqual(first['book.pdf'].hash, second['book.pdf'].hash);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('sitemap normalizes source keys and rejects cyclic navigation', () => {
    const result = processSitemap(['A [/a, ./a.md]', 'B [/b, a.md]', 'Prototype [/p, __proto__]']);
    assert.deepEqual(result.md2urls['a.md'], ['/a', '/b']);
    assert.deepEqual(result.md2urls['__proto__'], ['/p']);
    const cycle: unknown[] = [];
    cycle.push({ 'A [/a, a.md]': cycle });
    assert.throws(() => processSitemap(cycle), /cycle/);
});

test('JS stage includes absolute extension levels', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), '{"bundles":["page"]}');
        const level = path.join(dir, 'extension-blocks');
        await mkdir(path.join(level, 'widget'), { recursive: true });
        await writeFile(path.join(level, 'widget', 'widget.js'), 'globalThis.widgetLoaded = true;');
        ctx.env.levels.add(level);
        ctx.store['blockDeps'] = { page: ['widget'] };
        await jsStage(ctx);
        const hashes = ctx.store['jsHash'] as Record<string, { filename: string }>;
        assert.match(await readFile(path.join(ctx.outDir, 'js', hashes['page']!.filename), 'utf8'), /widgetLoaded/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('artifact stages reject symlink destinations without changing outside bytes', async () => {
    const { ctx, dir } = await makeProject();
    const { symlink } = await import('node:fs/promises');
    try {
        await mkdir(ctx.outDir, { recursive: true });
        const outside = path.join(dir, 'outside');
        await mkdir(outside);
        await writeFile(path.join(outside, 'sentinel.txt'), 'UNCHANGED');
        await writeFile(path.join(ctx.outDir, 'x.txt'), 'CONTENT');
        await symlink(outside, path.join(ctx.outDir, 'gzip'));
        await assert.rejects(async () => await compressionStage(ctx), /symbolic link/);
        await assert.rejects(async () => await manifestStage(ctx), /symbolic link/);
        await rm(path.join(ctx.outDir, 'gzip'));
        await symlink(ctx.outDir, path.join(ctx.outDir, 'cycle'));
        await assert.rejects(async () => await manifestStage(ctx), /symbolic link/);
        await rm(path.join(ctx.outDir, 'cycle'));
        await symlink(path.join(outside, 'sentinel.txt'), path.join(ctx.outDir, 'manifest.json'));
        await assert.rejects(async () => await manifestStage(ctx), /symbolic link/);
        assert.equal(await readFile(path.join(outside, 'sentinel.txt'), 'utf8'), 'UNCHANGED');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('manifest rejects ambiguous literal backslash paths', async () => {
    const { ctx, dir } = await makeProject();
    try {
        await mkdir(ctx.outDir, { recursive: true });
        await writeFile(path.join(ctx.outDir, 'a\\b.txt'), 'ambiguous');
        await assert.rejects(async () => await manifestStage(ctx), /backslash/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
test('htaccess refuses a linked destination before modifying outside bytes', async () => {
    const { ctx, dir } = await makeProject();
    const { symlink } = await import('node:fs/promises');

    try {
        await mkdir(ctx.outDir);
        const outside = path.join(dir, 'outside.txt');

        await writeFile(outside, 'KEEP');
        await symlink(outside, path.join(ctx.outDir, '.htaccess'));
        await assert.rejects(async () => await htaccessStage(ctx), /symbolic link/);
        assert.equal(await readFile(outside, 'utf8'), 'KEEP');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('nginx config rejects linked files while supporting a symbolic build workspace', async () => {
    const { ctx, dir } = await makeProject();
    const { symlink } = await import('node:fs/promises');
    const realBuild = path.join(dir, 'owned-workspace');

    try {
        await mkdir(realBuild);
        await symlink(realBuild, ctx.buildDir);
        await mkdir(ctx.configDir, { recursive: true });
        await writeFile(path.join(ctx.configDir, 'site.json'), '{"bundles":[]}');
        const outside = path.join(dir, 'outside.txt');
        const destination = path.join(realBuild, 'nginx.conf');

        await writeFile(outside, 'KEEP');
        await symlink(outside, destination);
        await assert.rejects(async () => await nginxStage(ctx), /symbolic link/);
        assert.equal(await readFile(outside, 'utf8'), 'KEEP');
        await rm(destination);
        await nginxStage(ctx);
        assert.match(await readFile(destination, 'utf8'), /Nginx configuration/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('sitemap header cannot silently consume unsupported inline declarations', () => {
    for (const header of ['sitemap: Home [/, index.md]', 'sitemap:invalid', 'sitemap: [Home]']) {
        assert.throws(() => parseIndentedSitemap(`${header}\n  - About [/about, about.md]`), /Invalid sitemap entry at line 1/);
    }
    assert.deepEqual(parseIndentedSitemap('sitemap: # navigation\n  - Home [/, index.md]'), ['Home [/, index.md]']);
    assert.deepEqual(parseIndentedSitemap('sitemap: [] # empty navigation'), []);
});

test('sitemap rejects unsupported known metadata values instead of discarding them', () => {
    for (const field of ['layout', 'navLabel']) {
        for (const value of [null, 12, false, [], {}]) {
            assert.throws(() => parseSitemapLine(`Page [/page, page.md, ${JSON.stringify({ [field]: value })}]`), /Invalid sitemap metadata/);
        }
    }
    assert.deepEqual(parseSitemapLine('Page [/page, page.md, {layout:"landing",navLabel:"Menu"}]')?.meta, { layout: 'landing', navLabel: 'Menu' });
});

