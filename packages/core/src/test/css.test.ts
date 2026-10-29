/**
 * Tests for the CSS stage's pure post-processor `processImageReferences`
 * (openspec `assets`/`html-output`): rewrites `url(...)` image references in
 * bundled CSS to the hashed filenames the images stage produced. Non-trivial: a
 * `url(./logo.png)` matches the image-mapping either by full relative path or by
 * basename (the mapping keys use a different prefix); the rewritten path is the
 * site-root URL the images stage chose (`/_i<hash>` for rasters, `/<hash>.svg`).
 * A wrong rewrite ships a broken image or a 404.
 *
 * @module test/css
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processImageReferences } from '../stages/css.js';

const map = {
    'logo/logo.png': '_iaabb1122',
    'icon/icon.svg': 'ccdd3344.svg',
    'hero/bg.webp': '_ieeff5566',
    'photo/img.jpg': '_i00112233',
};

// ---- url() rewrite: full-relative-path and basename match ------------------

test('processImageReferences: rewrites url() by exact relative path', async () => {
    const css = 'body { background: url(./logo/logo.png); }';
    assert.equal(await processImageReferences(css, map), 'body { background: url(/_iaabb1122); }');
});

test('processImageReferences: rewrites url() by basename when the prefix differs', async () => {
    // CSS says `logo.png`; the mapping keys `logo/logo.png` — basename match.
    const css = 'div { background-image: url(logo.png); }';
    assert.equal(await processImageReferences(css, map), 'div { background-image: url(/_iaabb1122); }');
});

test('processImageReferences: SVG references rewrite to the root (no /svg/ subdir)', async () => {
    const css = '.i { background: url(icon/icon.svg); }';
    assert.equal(await processImageReferences(css, map), '.i { background: url(/ccdd3344.svg); }');
});

test('processImageReferences: webp/jpg references use their negotiated image URL', async () => {
    assert.equal(await processImageReferences('a{background:url(bg.webp)}', map), 'a{background:url(/_ieeff5566)}');
    assert.equal(await processImageReferences('a{background:url(img.jpg)}', map), 'a{background:url(/_i00112233)}');
});

// ---- url() quoting variants -------------------------------------------------

test('processImageReferences: handles quoted url()', async () => {
    assert.equal(await processImageReferences('a{background:url("logo/logo.png")}', map), 'a{background:url(/_iaabb1122)}');
    assert.equal(await processImageReferences("a{background:url('logo/logo.png')}", map), 'a{background:url(/_iaabb1122)}');
});

test('processImageReferences: handles url() with internal whitespace', async () => {
    assert.equal(await processImageReferences('a{background:url( logo/logo.png )}', map), 'a{background:url(/_iaabb1122)}');
});

// ---- no-op cases ------------------------------------------------------------

test('processImageReferences: an unmatched image path is left unchanged', async () => {
    const css = 'a{background:url(nope.png)}';
    assert.equal(await processImageReferences(css, map), css);
});

test('processImageReferences: a non-image url() (other extensions) is not rewritten', async () => {
    // Only supported image extensions are rewritten.
    const css = 'a{background:url(font.woff2)}';
    assert.equal(await processImageReferences(css, map), css);
});

test('processImageReferences: rewrites multiple references in one stylesheet', async () => {
    const css = '.a{background:url(logo/logo.png)}.b{background:url(icon/icon.svg)}.c{background:url(bg.webp)}';
    const out = await processImageReferences(css, map);
    assert.ok(out.includes('url(/_iaabb1122)'));
    assert.ok(out.includes('url(/ccdd3344.svg)'));
    assert.ok(out.includes('url(/_ieeff5566)'));
});

test('processImageReferences: ./ and ../ prefixes are normalized before matching', async () => {
    // `./logo/logo.png` and `../logo/logo.png` should both match `logo/logo.png`.
    assert.ok((await processImageReferences('a{background:url(./logo/logo.png)}', map)).includes('/_iaabb1122'));
    assert.ok((await processImageReferences('a{background:url(../logo/logo.png)}', map)).includes('/_iaabb1122'));
});

test('image mapping resolves exact paths first and rejects ambiguous basename fallback', async () => {
    const mapping = { 'a/x.png': 'first', 'b/x.png': 'second' };
    assert.equal(await processImageReferences('a{background:url(b/x.png)}', mapping), 'a{background:url(/second)}');
    await assert.rejects(() => processImageReferences('a{background:url(x.png)}', mapping), /Ambiguous.*a\/x.png.*b\/x.png/);
    for (const source of ['missing/x.png', 'https://example.test/x.png']) {
        const css = `a{background:url(${source})}`;
        assert.equal(await processImageReferences(css, mapping), css);
    }
});
