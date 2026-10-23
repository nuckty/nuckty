/**
 * End-to-end tests for the CSS stage (`cssStage`) — exercises the full
 * orchestration: bemdecl-driven `@import` generation across multiple levels,
 * Lightning CSS `bundle` (inline `@import`, vendor prefixes, minification),
 * `url()` image-reference rewriting against the images-stage mapping, hashed
 * SVG inlining, content-hash output filename, `ctx.store.cssHash`, and the
 * `.build/hash-css.json` record. Runs `cssStage` against a real temp project
 * tree, not only the pure `processImageReferences` post-processor (which the
 * css.test.ts suite already covers).
 *
 * @module test/css-stage
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { cssStage } from '../stages/css.js';
import { NucktyEnv } from '../env/env.js';
import type { BuildContext } from '../pipeline/pipeline.js';
import { generateHash } from '../utils/hash.js';

/** Build a temp project + BuildContext seeded for the CSS stage. */
async function makeCtx(
    overrides: Partial<BuildContext> = {},
    prefix = 'nuckty-css-',
): Promise<{ ctx: BuildContext; dir: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), prefix));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'css-fixture', type: 'module' }));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
        baseUrl: 'https://example.com',
        rootTitle: 'X',
        contentRepo: 'content',
        assetRepos: [],
        githubRawBase: null,
        bundles: ['page'],
    }));
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    const ctx: BuildContext = {
        cwd: dir,
        configDir: path.join(dir, 'config'),
        buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'),
        target: 'default',
        env: new NucktyEnv(),
        templates: {} as BuildContext['templates'],
        store: {},
        cache: new Map(),
        ...overrides,
    };
    return { ctx, dir };
}

test('cssStage bundles block CSS across two levels with later-level priority and minifies', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // Two levels: `content` (base) and `blocks` (override). Later levels win
        // in the @import list, so the blocks-level color overrides content.
        await mkdir(path.join(dir, 'content', 'card'), { recursive: true });
        await mkdir(path.join(dir, 'blocks', 'card'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'card', 'card.css'), '.card{color:red;padding:4px}');
        await writeFile(path.join(dir, 'blocks', 'card', 'card.css'), '.card{color:blue}');

        ctx.store['blockDeps'] = { page: ['card'] };
        ctx.env.levels.add('content');
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string; filename: string; url: string; source: string[] }>;
        assert.ok(cssHash.page, 'page bundle produced a hash entry');
        assert.match(cssHash.page!.hash, /^[a-f0-9]{16}$/);
        assert.equal(cssHash.page!.filename, `${cssHash.page!.hash}.css`);
        assert.equal(cssHash.page!.url, `/${cssHash.page!.hash}.css`);
        // Both source files are recorded.
        assert.ok(cssHash.page!.source.includes('content/card/card.css'));
        assert.ok(cssHash.page!.source.includes('blocks/card/card.css'));

        const css = await readFile(path.join(ctx.outDir, 'css', cssHash.page!.filename), 'utf8');
        // Minified: whitespace and the trailing semicolon removed by lightningcss.
        assert.ok(!css.includes('\n'), 'output is minified (no newlines)');
        // Later-level priority: the final `.card` color wins as `color:blue`.
        assert.ok(css.includes('color:#00f'), 'later-level blue (#00f) wins');
        // Both the padding (content) and color (blocks) rules are present.
        assert.ok(css.includes('padding:4px'), 'content-level padding preserved');
        // hash-css.json persisted with the entry.
        const hashFile = JSON.parse(await readFile(path.join(ctx.buildDir, 'hash-css.json'), 'utf8'));
        assert.equal(hashFile.page.hash, cssHash.page!.hash);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage bundles element CSS (block__elem) via the __ split in blockCssPath', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'menu', '__item'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'menu', 'menu.css'), '.menu{display:flex}');
        await writeFile(path.join(dir, 'blocks', 'menu', '__item', 'menu__item.css'), '.menu__item{margin:2px}');

        ctx.store['blockDeps'] = { page: ['menu', 'menu__item'] };
        ctx.env.levels.add('content');
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        assert.ok(css.includes('display:flex'), 'block CSS inlined');
        assert.ok(css.includes('menu__item'), 'element CSS inlined');
        assert.ok(css.includes('margin:2px'), 'element rule present');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage applies Lightning CSS vendor prefixes for the configured targets', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'box'), { recursive: true });
        // Safari 16 needs the WebKit user-select declaration.
        await writeFile(path.join(dir, 'blocks', 'box', 'box.css'), '.box{width:max-content;user-select:none;-webkit-overflow-scrolling:touch}');

        ctx.store['blockDeps'] = { page: ['box'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        assert.ok(css.includes('-webkit-user-select:none'), 'Safari user-select prefix emitted');
        assert.ok(!css.includes('-webkit-max-content'), 'obsolete width prefix omitted for modern Safari');
        assert.ok(css.includes('max-content'), 'unprefixed max-content retained');
        assert.ok(css.includes('-webkit-overflow-scrolling'), 'legacy -webkit-overflow-scrolling preserved');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage rewrites url() image references through the image-mapping and inlines hashed SVGs', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'hero'), { recursive: true });
        // An SVG that will be referenced by URL and then inlined as a data URI.
        const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect/></svg>';
        await writeFile(path.join(dir, 'blocks', 'hero', 'hero.css'),
            '.hero{background:url(./logo.png)}.icon{background:url(./icon.svg)}');

        // Image mapping from the images stage: the hashed filename carries its
        // extension so processImageReferences can route it to the format subdir
        // (png → /png/, svg → root). SVG is later inlined as a data URI.
        const pngHash = generateHash('fake-png');
        const svgHash = generateHash(svgContent);
        ctx.store['imageMapping'] = {
            'hero/logo.png': `${pngHash}.png`,
            'hero/icon.svg': `${svgHash}.svg`,
        };
        ctx.store['blockDeps'] = { page: ['hero'] };
        ctx.env.levels.add('blocks');

        // The hashed SVG file must exist under site/svg/ for inlineHashedSVGs to inline it.
        await mkdir(path.join(ctx.outDir, 'svg'), { recursive: true });
        await writeFile(path.join(ctx.outDir, 'svg', `${svgHash}.svg`), svgContent);

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        // PNG rewritten to /png/<hash>.png.
        assert.ok(css.includes(`url(/png/${pngHash}.png)`), 'png url rewritten to /png/ subdir');
        assert.ok(!css.includes('logo.png'), 'original png path is gone');
        // SVG inlined as a data URI (encodeURIComponent of the SVG content).
        assert.ok(css.includes('data:image/svg+xml,'), 'svg inlined as a data URI');
        assert.ok(css.includes(encodeURIComponent(svgContent)), 'data URI carries the SVG payload');
        assert.ok(!css.includes(`${svgHash}.svg`), 'svg file reference replaced by the data URI');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage writes a content-hashed filename and records ctx.store.cssHash', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'a'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'a', 'a.css'), '.a{color:red}');
        ctx.store['blockDeps'] = { page: ['a'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string; filename: string }>;
        const written = await readFile(path.join(ctx.outDir, 'css', cssHash.page!.filename), 'utf8');
        assert.equal(cssHash.page!.hash, generateHash(written), 'stored hash matches the written content hash');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage produces no entry for an empty bundle (bemdecl is empty)', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        ctx.store['blockDeps'] = { page: [] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, unknown>;
        assert.ok(!cssHash.page, 'no hash entry for an empty bundle');
        // hash-css.json is not written when there is nothing to record.
        await assert.rejects(() => access(path.join(ctx.buildDir, 'hash-css.json')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage skips a block whose CSS file is missing on disk (missing CSS)', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // blockDeps declares a block with no .css file; an existing block is also
        // declared to prove the bundle still emits with the present block only.
        await mkdir(path.join(dir, 'blocks', 'real'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'real', 'real.css'), '.real{color:green}');

        ctx.store['blockDeps'] = { page: ['ghost', 'real'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string; source: string[] }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        assert.ok(css.includes('color:green'), 'present block emitted');
        assert.ok(!cssHash.page!.source.some((s) => s.includes('ghost')), 'missing block not in source list');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage leaves an unmatched url() reference unchanged (absent from the mapping)', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'p'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'p', 'p.css'), '.p{background:url(./missing.png)}');
        ctx.store['blockDeps'] = { page: ['p'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        assert.ok(css.includes('url(./missing.png)'), 'unmapped url() left verbatim');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage tolerates duplicate block dependencies and records both sources', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'dup'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'dup', 'dup.css'), '.dup{color:red}');
        // The same block listed twice in the bundle deps.
        ctx.store['blockDeps'] = { page: ['dup', 'dup'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string; source: string[] }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        // The bundle remains usable; source metadata retains both declarations.
        assert.ok(css.includes('color:red'), 'rule present');
        assert.equal(cssHash.page!.source.length, 2, 'both declaration entries recorded as sources');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage keeps a missing SVG reference as a url() (inlineHashedSVGs skips ENOENT)', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'ic'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'ic', 'ic.css'), '.ic{background:url(./gone.svg)}');
        // Mapping points to an SVG that does NOT exist on disk under site/svg/.
        ctx.store['imageMapping'] = { 'ic/gone.svg': 'deadbeefdeadbeef.svg' };
        ctx.store['blockDeps'] = { page: ['ic'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const cssHash = ctx.store['cssHash'] as Record<string, { hash: string }>;
        const css = await readFile(path.join(ctx.outDir, 'css', `${cssHash.page!.hash}.css`), 'utf8');
        // The SVG is rewritten to the root url() but NOT inlined (file missing).
        assert.ok(css.includes('url(/deadbeefdeadbeef.svg)'), 'missing svg kept as a url() reference');
        assert.ok(!css.includes('data:image/svg+xml,'), 'no data URI for a missing svg');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage preserves a previously written hash-css.json entry across bundles', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // Seed an existing entry for a different bundle; the stage must merge,
        // not overwrite, so a multi-bundle build keeps every bundle's record.
        await mkdir(ctx.buildDir, { recursive: true });
        const preExisting = { other: { hash: '0123456789abcdef', filename: '0123456789abcdef.css', url: '/0123456789abcdef.css', source: ['blocks/other/other.css'] } };
        await writeFile(path.join(ctx.buildDir, 'hash-css.json'), JSON.stringify(preExisting));

        await mkdir(path.join(dir, 'blocks', 'a'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'a', 'a.css'), '.a{color:red}');
        ctx.store['blockDeps'] = { page: ['a'] };
        ctx.env.levels.add('blocks');

        await cssStage(ctx);

        const hashFile = JSON.parse(await readFile(path.join(ctx.buildDir, 'hash-css.json'), 'utf8'));
        assert.ok(hashFile.other, 'previous bundle entry preserved');
        assert.ok(hashFile.page, 'new bundle entry added');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage fails the build on malformed CSS that lightningcss rejects', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'blocks', 'bad'), { recursive: true });
        // An empty selector (`@@@invalid`) is a hard error lightningcss raises
        // with `errorRecovery: false` (the stage's setting).
        await writeFile(path.join(dir, 'blocks', 'bad', 'bad.css'), '@@@invalid;;; .bad{color:red}');
        ctx.store['blockDeps'] = { page: ['bad'] };
        ctx.env.levels.add('blocks');

        await assert.rejects(async () => await cssStage(ctx), /selector|parse|Invalid/i,
            'malformed CSS fails the build with a lightningcss error');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('cssStage preserves quotes and backslashes in filesystem import paths', async () => {
    const { ctx, dir } = await makeCtx({}, 'nuckty-css-"\\-');
    try {
        await mkdir(path.join(dir, 'blocks', 'card'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'card', 'card.css'), '.card{color:red}');
        ctx.store['blockDeps'] = { page: ['card'] };
        ctx.env.levels.add('blocks');
        await cssStage(ctx);
        const hashes = ctx.store['cssHash'] as Record<string, { filename: string }>;
        assert.match(await readFile(path.join(ctx.outDir, 'css', hashes.page!.filename), 'utf8'), /color:red/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
