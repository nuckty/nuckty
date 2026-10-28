/**
 * Direct tests for cross-document + same-document anchor resolution
 * (openspec `markdown`): `buildAnchorMap` (githubSlug → hierarchicalAnchor,
 * with GitHub `-N` duplicate suffixes and the `2.0.5` → `205` version alias)
 * and `resolvePageAnchors` (rewrites `#anchor` / `url#anchor` hrefs against a
 * page's anchor map, leaving unknown/external links verbatim).
 *
 * These exercise the recursive BemNode tree walk directly — including nested
 * arrays, nested node `content`, URL-encoded anchors, malformed percent-encoding,
 * and the same-document vs cross-document vs unknown-target branches — so the
 * coverage of `src/markdown/resolve-anchors.ts` reflects every branch, not just
 * the happy path exercised through the sitemap stage.
 *
 * @module test/resolve-anchors
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnchorMap, resolvePageAnchors } from '../markdown/resolve-anchors.js';
import type { SitemapArtifact, SitemapPage } from '../stages/types.js';
import type { BemNode, BEMTree } from '../bem/types.js';

/** Build a heading record as the sitemap stage stores it. */
function heading(level: number, text: string, anchor: string) {
    return { level, text, rawText: text, anchor };
}

/** A `<a href>` BemNode. */
function link(href: string, content: BEMTree = 'x'): BemNode {
    return { tag: 'a', attrs: { href }, content };
}

function page(url: string, tree: BEMTree): SitemapPage {
    return { file: `${url}.md`, url, name: url, title: url, section: null, breadcrumbs: [], tree };
}

// ---- buildAnchorMap -------------------------------------------------------

test('buildAnchorMap: empty / undefined headings produce an empty map', () => {
    assert.equal(buildAnchorMap(undefined).size, 0);
    assert.equal(buildAnchorMap([]).size, 0);
});

test('buildAnchorMap: a single heading maps its githubSlug to the anchor', () => {
    const map = buildAnchorMap([heading(2, 'Getting Started', 'getting-started')]);
    assert.equal(map.get('getting-started'), 'getting-started');
});

test('buildAnchorMap: Cyrillic heading text is preserved in the slug key', () => {
    const map = buildAnchorMap([heading(2, 'Разделение экрана', 'razdelenie-ekrana')]);
    // createGitHubSlug lowercases and keeps Cyrillic, joining words with '-'.
    assert.equal(map.get('разделение-экрана'), 'razdelenie-ekrana');
});

test('buildAnchorMap: numbered heading keeps its numeric prefix in the key', () => {
    // Source links carry the numbered prefix (`#12-foo`), so the key must too.
    const map = buildAnchorMap([heading(2, '12. Foo', '12-foo')]);
    assert.equal(map.get('12-foo'), '12-foo');
});

test('buildAnchorMap: duplicate headings get GitHub -1, -2 suffixes on the key', () => {
    const map = buildAnchorMap([
        heading(2, 'Notes', 'notes'),
        heading(2, 'Notes', 'notes-1'),
        heading(2, 'Notes', 'notes-2'),
    ]);
    // First occurrence keeps the bare slug; the 2nd and 3rd get -1, -2.
    assert.equal(map.get('notes'), 'notes');
    assert.equal(map.get('notes-1'), 'notes-1');
    assert.equal(map.get('notes-2'), 'notes-2');
});

test('buildAnchorMap: version heading 2.0.5 is also keyable as 205', () => {
    const map = buildAnchorMap([heading(2, '2.0.5', '205')]);
    // createGitHubSlug strips dots from `2.0.5` → `205`, and the version-pattern
    // entry (dots removed) also yields `205`. A source link `#205` resolves to
    // the `2.0.5` heading through either key.
    assert.equal(map.get('205'), '205');
});

test('buildAnchorMap: version heading 2.0.10 keyable as 2010 (dots removed)', () => {
    const map = buildAnchorMap([heading(2, '2.0.10', 'v2010')]);
    assert.equal(map.get('2010'), 'v2010');
});

test('buildAnchorMap: a two-part version 2.0 is also keyable without dots', () => {
    const map = buildAnchorMap([heading(2, '2.0', '20')]);
    assert.equal(map.get('20'), '20');
});

test('buildAnchorMap: headings with no anchor are skipped', () => {
    const map = buildAnchorMap([
        heading(2, 'NoAnchor', ''),
        heading(2, 'Real', 'real'),
    ]);
    assert.equal(map.size, 1);
    assert.equal(map.get('real'), 'real');
});

test('buildAnchorMap: a heading whose text produces an empty slug is skipped', () => {
    // createGitHubSlug('!!!') drops every non-word char → '' → the heading is
    // skipped (a link could never target an empty slug anyway).
    const map = buildAnchorMap([heading(2, '!!!', 'bang'), heading(2, 'Real', 'real')]);
    assert.equal(map.size, 1);
    assert.equal(map.get('real'), 'real');
});

// ---- resolvePageAnchors ---------------------------------------------------

/** Build a minimal sitemap artifact with the given pages (keyed by url). */
function sitemapOf(pages: SitemapPage[]): SitemapArtifact {
    const out: SitemapArtifact = { sitemap: [], pages: {}, md2url: {}, md2urls: {}, url2md: {} };
    for (const p of pages) {
        out.pages[p.url] = p;
        out.md2url[p.file] = p.url;
        out.url2md[p.url] = p.file;
    }
    return out;
}

test('resolvePageAnchors: same-document anchor is resolved against this page map', () => {
    const tree: BemNode = { tag: 'div', content: [link('#getting-started')] };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', buildAnchorMap([heading(2, 'Getting Started', 'getting-started')])]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '#getting-started');
});

test('resolvePageAnchors: same-document anchor with explicit this-url base resolves', () => {
    const tree: BemNode = { tag: 'div', content: [link('/docs#notes')] };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', buildAnchorMap([heading(2, 'Notes', 'notes')])]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '#notes');
});

test('resolvePageAnchors: cross-document anchor resolves against the target page map', () => {
    const tree: BemNode = { tag: 'div', content: [link('/other#section')] };
    const p = page('/docs', tree);
    const other = page('/other', { tag: 'div' });
    const sitemap = sitemapOf([p, other]);
    const maps = new Map([
        ['/docs', new Map()],
        ['/other', buildAnchorMap([heading(2, 'Section', 'section')])],
    ]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other#section');
});

test('resolvePageAnchors: URL-encoded anchor is decoded before lookup', () => {
    // `%D0%B0` decodes to the Cyrillic "а"; the map keys the decoded slug.
    const tree: BemNode = { tag: 'div', content: [link('/other#%D0%B0')] };
    const p = page('/docs', tree);
    const other = page('/other', { tag: 'div' });
    const sitemap = sitemapOf([p, other]);
    const targetMap = new Map([['а', 'a-anchor']]);
    const maps = new Map([['/docs', new Map()], ['/other', targetMap]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other#a-anchor');
});

test('resolvePageAnchors: malformed percent-encoded anchor falls back to the raw anchor', () => {
    // `%E0%A4%A` is not a valid percent-encoded sequence; decodeURIComponent
    // throws, and the resolver keeps the original anchor verbatim.
    const tree: BemNode = { tag: 'div', content: [link('/other#%E0%A4%A')] };
    const p = page('/docs', tree);
    const other = page('/other', { tag: 'div' });
    const sitemap = sitemapOf([p, other]);
    const maps = new Map([['/docs', new Map()], ['/other', new Map()]]);
    resolvePageAnchors(p, sitemap, maps);
    // No matching key → the anchor passes through unchanged.
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other#%E0%A4%A');
});

test('resolvePageAnchors: empty anchor (href ends with #) is left unchanged', () => {
    const tree: BemNode = { tag: 'div', content: [link('/other#')] };
    const p = page('/docs', tree);
    const other = page('/other', { tag: 'div' });
    const sitemap = sitemapOf([p, other]);
    const maps = new Map([['/docs', new Map()], ['/other', buildAnchorMap([heading(2, 'X', 'x')])]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other#');
});

test('resolvePageAnchors: unknown target page leaves the href verbatim', () => {
    const tree: BemNode = { tag: 'div', content: [link('/missing#anchor')] };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', new Map()]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/missing#anchor');
});

test('resolvePageAnchors: unresolved anchor on a known page passes through verbatim', () => {
    const tree: BemNode = { tag: 'div', content: [link('/other#nope')] };
    const p = page('/docs', tree);
    const other = page('/other', { tag: 'div' });
    const sitemap = sitemapOf([p, other]);
    const maps = new Map([['/docs', new Map()], ['/other', buildAnchorMap([heading(2, 'Real', 'real')])]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other#nope');
});

test('resolvePageAnchors: links without a # are left untouched', () => {
    const tree: BemNode = { tag: 'div', content: [link('/other'), link('https://ex.com/x')] };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p, page('/other', { tag: 'div' })]);
    const maps = new Map([['/docs', new Map()]]);
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '/other');
    assert.equal((tree.content as BemNode[])[1]!.attrs!['href'], 'https://ex.com/x');
});

test('resolvePageAnchors: non-anchor nodes (<div>, text) are walked but not rewritten', () => {
    const tree: BemNode = {
        tag: 'div',
        content: [
            { tag: 'p', content: 'hello' },
            link('#notes'),
            'plain text',
        ],
    };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', buildAnchorMap([heading(2, 'Notes', 'notes')])]]);
    resolvePageAnchors(p, sitemap, maps);
    const arr = tree.content as BemNode[];
    assert.equal(arr[0]!.tag, 'p');
    assert.equal(arr[2], 'plain text');
    assert.equal(arr[1]!.attrs!['href'], '#notes');
});

test('resolvePageAnchors: nested arrays and nested content are walked recursively', () => {
    const tree: BemNode = {
        tag: 'div',
        content: [
            [
                link('#a'),
                { tag: 'section', content: link('#b') },
            ],
            { tag: 'ul', content: [{ tag: 'li', content: link('#c') }] },
        ],
    };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', buildAnchorMap([
        heading(2, 'A', 'a'),
        heading(2, 'B', 'b'),
        heading(2, 'C', 'c'),
    ]) ]]);
    resolvePageAnchors(p, sitemap, maps);
    const top = tree.content as unknown[];
    const first = top[0] as BemNode[];
    assert.equal(first[0]!.attrs!['href'], '#a');
    assert.equal((first[1]!.content as BemNode).attrs!['href'], '#b');
    const second = top[1] as BemNode;
    assert.equal(((second.content as BemNode[])[0]!.content as BemNode).attrs!['href'], '#c');
});

test('resolvePageAnchors: a page with no tree is a no-op', () => {
    const p = page('/docs', undefined as unknown as BEMTree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', new Map()]]);
    // Must not throw.
    resolvePageAnchors(p, sitemap, maps);
    assert.equal(p.tree, undefined);
});

test('resolvePageAnchors: same-doc anchor resolves when the page has no map entry', () => {
    // anchorMaps.get(page.url) is undefined → resolveAnchor receives no map
    // and returns the anchor verbatim (no crash).
    const tree: BemNode = { tag: 'div', content: [link('#lonely')] };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map<string, Map<string, string>>(); // no entry for /docs
    resolvePageAnchors(p, sitemap, maps);
    assert.equal((tree.content as BemNode[])[0]!.attrs!['href'], '#lonely');
});

test('resolvePageAnchors: a string child of content is walked without error', () => {
    // The recursive walk visits string leaves (typeof tree === 'string').
    const tree: BemNode = {
        tag: 'div',
        content: ['a plain string', link('#notes')],
    };
    const p = page('/docs', tree);
    const sitemap = sitemapOf([p]);
    const maps = new Map([['/docs', buildAnchorMap([heading(2, 'Notes', 'notes')])]]);
    resolvePageAnchors(p, sitemap, maps);
    const arr = tree.content as unknown[];
    assert.equal(arr[0], 'a plain string');
    assert.equal((arr[1] as BemNode).attrs!['href'], '#notes');
});

test('resolvePageAnchors resolves fragments using pathname while retaining queries', () => {
    const source = page('/source', [link('/target?q=1#child'), link('?q=2#child')]);
    const target = page('/target', []);
    const sitemap = { pages: { '/source': source, '/target': target }, md2url: {}, md2urls: {}, url2md: {}, sitemap: [] } as unknown as SitemapArtifact;
    const maps = new Map([
        ['/source', new Map([['child', 'source-child']])],
        ['/target', new Map([['child', 'target-child']])],
    ]);
    resolvePageAnchors(source, sitemap, maps);
    const nodes = source.tree as BemNode[];
    assert.equal(nodes[0]!.attrs!['href'], '/target?q=1#target-child');
    assert.equal(nodes[1]!.attrs!['href'], '?q=2#source-child');
});
