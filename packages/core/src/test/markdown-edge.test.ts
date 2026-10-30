/**
 * Non-trivial markdown → BemNode edge cases.
 *
 * Invariant to the parser (markdown-it was replaced by remark/unified): these
 * tests lock behavior, not internals. Covers openspec `markdown` spec
 * SHALL/WHEN/THEN beyond the basic `markdown.test.ts` contract: nested
 * tables/lists, inline emphasis/escape/breaks, 3-level anchors, heading/link
 * literals, image-in-link, raw HTML, and generic-directive fallback.
 *
 * @module test/markdown-edge
 */

import { markdownCollection } from './helpers/markdown.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdown } from '../markdown/remark.js';
import { postprocessHtml } from '../markdown/html-postprocess.js';
import { render } from '../bem/render.js';

const TEMPLATES = { templates: markdownCollection() };

function mdToHtml(src: string, opts: Parameters<typeof createMarkdown>[0] = {}): string {
    // Markdown-bridge edge cases only. Typography is an extension
    // (@nuckty/ext-markdown-typography-ru) and is not applied here; typographic
    // edge cases live in the extension.
    const { render: renderMd } = createMarkdown(opts);
    const { tree } = renderMd(src);
    return render({ block: 'article', content: tree }, TEMPLATES);
}

// ---- Tables (openspec: CommonMark + GFM tables map to BEMTree) --------------

test('table: empty body cell renders empty <td>', () => {
    const html = mdToHtml('| A | B |\n| --- | --- |\n| 1 | |\n');
    assert.ok(html.includes('<table class=article__table>'));
    assert.ok(html.includes('<th class="article__table-cell article__table-cell_header">A'));
    // Empty cell (column B): `<td class=article__table-cell>1<td class=article__table-cell>`
    // — the empty cell has no inner content (</td> omitted by the minimizer).
    assert.ok(/<td class=article__table-cell>1<td class=article__table-cell></.test(html), 'empty <td> expected');
});

test('table: cell with inline code + link keeps both', () => {
    const html = mdToHtml('| H |\n| --- |\n| [`x`](/y) `code` |\n');
    // The link wraps the inline code: <a href=/y><code>x</code></a>.
    assert.ok(html.includes('<a class=article__link href=/y><code class=article__inline-code>x</code></a>'));
    assert.ok(html.includes('<code class=article__inline-code>code</code>'));
});

test('table: cyrillic header preserved verbatim', () => {
    const html = mdToHtml('| Заголовок | Колонка |\n| --- | --- |\n| 1 | 2 |\n');
    assert.ok(html.includes('Заголовок'));
    assert.ok(html.includes('Колонка'));
});

// ---- Lists (nested, ordered gaps, tight/loose) -------------------------------

test('list: nested ul inside ul', () => {
    const html = mdToHtml('- a\n  - b\n  - c\n- d\n');
    assert.ok(html.includes('<ul class=article__list>'));
    // two nested <ul> occurrences: outer + inner
    const ulCount = (html.match(/<ul class=article__list>/g) ?? []).length;
    assert.equal(ulCount, 2);
});

test('list: ol inside ul', () => {
    const html = mdToHtml('- item\n  1. first\n  2. second\n');
    assert.ok(html.includes('<ol class="article__list article__list_ordered">'));
    assert.ok(html.includes('first'));
});

test('list: ordered with gaps keeps sequence', () => {
    const html = mdToHtml('1. one\n3. three\n');
    assert.ok(html.includes('<ol class="article__list article__list_ordered">'));
    assert.ok(html.includes('one'));
    assert.ok(html.includes('three'));
});

test('list: loose list (blank line between items) does NOT wrap items in <p> (markdown.js parity)', () => {
    const html = mdToHtml('- one\n\n- two\n');
    const pCount = (html.match(/<p class=article__paragraph>/g) ?? []).length;
    assert.equal(pCount, 0, 'loose list does not wrap items in <p> (markdown.js parity)');
});

// ---- Inline: nested emphasis, breaks, escapes, autolink --------------------

test('inline: nested emphasis bold/italic', () => {
    const html = mdToHtml('**bold *italic* bold**');
    assert.ok(html.includes('<strong>bold <em>italic</em> bold</strong>'));
});

test('inline: emphasis inside link', () => {
    const html = mdToHtml('[*em* inside](/x)');
    assert.ok(html.includes('<a class=article__link href=/x><em>em</em> inside</a>'));
});

test('inline: code_inline HTML-escapes special chars', () => {
    const html = mdToHtml('use `<a>` safely');
    assert.ok(html.includes('<code class=article__inline-code>&lt;a&gt;</code>'));
});

test('code: raw asset URLs in copied code stay absolute on the configured site', () => {
    const rawBase = 'https://github.com/acme/docs/raw/main/';
    const options = { githubRawBase: rawBase, baseUrl: 'https://example.test/' };
    const html = mdToHtml(
        'Run `curl https://github.com/acme/docs/raw/main/files/file.zip`\n\n```sh\ncurl https://github.com/acme/docs/raw/main/files/file.zip\n```',
        options,
    );
    assert.ok(html.includes('<code class=article__inline-code>curl https://example.test/files/file.zip</code>'), html);
    assert.ok(html.includes('<code>curl https://example.test/files/file.zip\n</code>'), html);
    assert.ok(mdToHtml('[asset](https://github.com/acme/docs/raw/main/files/file.zip)', options).includes('href=/files/file.zip'));
});

test('code: raw asset URLs stay absolute when no site base URL is configured', () => {
    const rawUrl = 'https://github.com/acme/docs/raw/main/files/file.zip';
    const html = mdToHtml(`Run \`curl ${rawUrl}\`\n\n\`\`\`sh\ncurl ${rawUrl}\n\`\`\``, {
        githubRawBase: 'https://github.com/acme/docs/raw/main/',
    });
    assert.ok(html.includes(`<code class=article__inline-code>curl ${rawUrl}</code>`), html);
    assert.ok(html.includes(`<code>curl ${rawUrl}\n</code>`), html);
    assert.ok(mdToHtml(`[asset](${rawUrl})`, {
        githubRawBase: 'https://github.com/acme/docs/raw/main/',
    }).includes('href=/files/file.zip'));
});

test('code: unrelated curl URLs ending in zip are not rewritten as site paths', () => {
    const html = mdToHtml('`curl https://downloads.example.test/file.zip`', {
        githubRawBase: 'https://github.com/acme/docs/raw/main/',
        baseUrl: 'https://example.test',
    });
    assert.ok(html.includes('<code class=article__inline-code>curl https://downloads.example.test/file.zip</code>'), html);
    assert.ok(!html.includes('curl /file.zip'), html);
});

test('inline: softbreak becomes space, hardbreak becomes <br>', () => {
    const soft = mdToHtml('line one\nline two');
    assert.ok(soft.includes('line one\nline two') || soft.includes('line one line two'));
    const hard = mdToHtml('line one  \nline two');
    assert.ok(hard.includes('<br>'));
});

test('inline: escaped asterisks render literally', () => {
    const html = mdToHtml('\\*not bold\\*');
    assert.ok(html.includes('*not bold*'));
    assert.ok(!html.includes('<strong>'));
});

test('inline: autolink bare URL becomes a link', () => {
    const html = mdToHtml('see https://example.com here');
    // markdown-it linkify:true and remark-gfm autolink-literal both linkify.
    assert.ok(html.includes('<a class=article__link href=https://example.com>https://example.com</a>'));
});

// ---- Anchors (3-level hierarchy, numbered dot, slash, cyrillic) -------------

test('anchor: 3-level hierarchy composes', () => {
    const html = mdToHtml('# Шины\n\n## Зимние\n\n### Шипованные\n');
    // openspec scenario: id=шины-зимние-шипованные, Cyrillic kept verbatim.
    assert.ok(html.includes('id=шины-зимние-шипованные'));
});

test('anchor: numbered heading trailing dot dropped from id', () => {
    const html = mdToHtml('# 1.2. Введение\n');
    // The slugify strips the numbered prefix entirely: id=введение.
    assert.ok(html.includes('id=введение'), `got: ${html}`);
});

test('anchor: slash in heading becomes separator', () => {
    const html = mdToHtml('# A/B\n');
    assert.ok(html.includes('id=a-b'));
});

test('anchor: custom {#id} overrides generated', () => {
    const html = mdToHtml('# Текст {#fixed}');
    assert.ok(html.includes('id=fixed'));
});

test('anchor: cyrillic preserved verbatim (no transliteration, no encoding)', () => {
    const html = mdToHtml('# Топливо');
    assert.ok(html.includes('id=топливо'));
    assert.ok(!html.includes('%D'));
});

test('link: relative .md with anchor resolves url + keeps anchor (openspec)', () => {
    // openspec `markdown` spec scenario: `[model](../how/bemjson.md#шины-зимние)`
    // resolves to the target page URL with the anchor preserved. The bridge
    // splits `.md` from `#anchor`, resolves the `.md` via `md2url`, and
    // re-attaches the (decoded) anchor.
    const html = mdToHtml('[x](page.md#sec)', { md2url: { 'page.md': '/page' } });
    assert.ok(html.includes('href=/page#sec'), `expected href=/page#sec, got: ${html}`);
});

test('link: unknown .md in non-empty md2url throws (broken-link abort)', () => {
    // openspec requires broken-link detection to abort the build so a page
    // with a broken link never reaches the artifact. The bridge throws only
    // when `md2url` is non-empty (a populated map means the sitemap is loaded
    // and the link target should have been found).
    assert.throws(
        () => mdToHtml('[x](missing.md)', { md2url: { 'page.md': '/page' } }),
        /Unknown relative link/,
    );
});

test('link: unknown .md with empty md2url passes through (no sitemap loaded)', () => {
    // With an empty md2url (no sitemap loaded), the bridge leaves the href as-is.
    // This matches the legacy `transformLinkPath` early-return guard.
    const html = mdToHtml('[x](missing.md)');
    assert.ok(html.includes('href=missing.md'));
});

test('link: image inside link', () => {
    const html = mdToHtml('[![alt](img.png "t")](/x)', { imageMapping: { 'img.png': '/i.png' } });
    assert.ok(html.includes('<a class=article__link href=/x>'));
    assert.ok(html.includes('<img class=article__image src=/i.png alt=alt'));
    // Title "t" is short and safe → emitted unquoted.
    assert.ok(html.includes('title=t'));
});

test('link: external with query string is quoted', () => {
    const html = mdToHtml('[q](https://ex.com/x?y=1)');
    // The query contains `=`, which requires a quoted attribute value.
    assert.ok(html.includes('href="https://ex.com/x?y=1"'));
});

test('link: mailto preserved', () => {
    const html = mdToHtml('[m](mailto:a@b.com)');
    assert.ok(html.includes('href=mailto:a@b.com'));
});

// ---- Images (mapping, title with special chars, cyrillic alt) --------------

test('image: title with quotes survives an HTML parser round-trip (RENDER-01)', () => {
    // In markdown, quotes inside a title must be backslash-escaped: \"q\".
    // The LOGICAL value `A "q" title` must survive HTML parsing — the emitted
    // attribute entity-escapes the inner quotes (`&quot;`), or the attribute
    // would terminate at the first inner `"` (the old verbatim emission).
    const html = mdToHtml('![alt](img.png "A \\"q\\" title")', { imageMapping: { 'img.png': '/x.png' } });
    assert.ok(html.includes('title="A &quot;q&quot; title"'));
});

test('image: cyrillic alt preserved', () => {
    const html = mdToHtml('![Подпись](img.png)', { imageMapping: { 'img.png': '/x.png' } });
    assert.ok(html.includes('alt=Подпись'));
});

test('image: unknown src left as-is when not in mapping', () => {
    const html = mdToHtml('![alt](other.png)');
    assert.ok(html.includes('src=other.png'));
});

// ---- HTML (block raw, inline span raw, script passthrough, not escaped) -----

test('html: block-level raw passthrough', () => {
    const html = mdToHtml('<div class=custom>raw</div>');
    assert.ok(html.includes('<div class=custom>raw</div>'));
});

test('html: inline span preserved as raw, not escaped', () => {
    const html = mdToHtml('text <span>x</span> more');
    assert.ok(html.includes('<span>x</span>'));
    assert.ok(!html.includes('&lt;span&gt;'));
});

test('html: inline script preserved verbatim', () => {
    const html = mdToHtml('<script>console.log(1)</script>');
    assert.ok(html.includes('<script>console.log(1)</script>'));
});

// ---- Generic directives (openspec: unknown directive → plain content) -------

test('directive: container without mapping falls back to plain content', () => {
    const html = mdToHtml(':::callout\n\ninner text\n\n:::\n');
    assert.ok(html.includes('inner text'));
    assert.ok(!html.includes('callout"'));
});

test('directive: unknown and declined leaf directives preserve visible labels', () => {
    const mappings = new Map<string, import('../env/env.js').DirectiveHandler>([['video', () => null]]);

    for (const directiveMappings of [undefined, mappings]) {
        const html = mdToHtml('::video[Кот]{provider=youtube id=x}', { directiveMappings });

        assert.equal(html, '<div class=article><p class=article__paragraph>Кот</div>');
    }
});

test('directive: an unknown leaf directive between paragraphs stays a paragraph, and tight list items stay unwrapped', () => {
    assert.equal(mdToHtml('Before\n\n::note[Visible *label*]\n\nAfter'), '<div class=article><p class=article__paragraph>Before<p class=article__paragraph>Visible <em>label</em><p class=article__paragraph>After</div>');
    assert.ok(!mdToHtml('- ::note[item]\n- other').includes('<p'));
});

// ---- Mapped directives (a markdown-extension maps `:::name` → BemNode) ------

test('directive: mapped container handler produces its BemNode instead of content', () => {
    // A markdown-extension registers `env.markdown.directive('gallery', handler)`
    // → the bridge calls the handler with the directive node and emits its
    // return value. The core knows nothing about `gallery`; the handler owns the
    // BEMJSON (openspec `markdown` spec: core knows no specific construct).
    const mappings = new Map<string, import('../env/env.js').DirectiveHandler>([
        ['gallery', () => ({ block: 'gallery', tag: 'div', content: [{ tag: 'span', content: 'g' }] })],
    ]);
    const html = mdToHtml(':::gallery\n\ninner text\n\n:::\n', { directiveMappings: mappings });
    assert.ok(html.includes('class=gallery'), 'gallery block emitted from the handler');
    // The handler's `span` child has no block of its own → inherits `gallery`
    // (correct BEM, same rule as any block subtree).
    assert.ok(html.includes('<span class=gallery>g</span>'), 'handler content serialized');
    // The directive's own content (`inner text`) is NOT emitted — the handler
    // replaced it wholesale.
    assert.ok(!html.includes('inner text'), 'handler return replaces the directive content');
});

test('directive: handler returning null falls back to plain content', () => {
    // The handler is the source of truth: null means "I decline, emit the
    // directive's plain content" (openspec: unknown/declining directive → plain
    // content, no break). Same fallback as an unmapped directive, but opt-in.
    const mappings = new Map<string, import('../env/env.js').DirectiveHandler>([
        ['callout', () => null],
    ]);
    const html = mdToHtml(':::callout\n\ninner text\n\n:::\n', { directiveMappings: mappings });
    assert.ok(html.includes('inner text'), 'null handler falls back to plain content');
    assert.ok(!html.includes('callout'), 'no callout block emitted');
});

test('directive: handler receives attributes parsed from the {#id .class key=val} fence', () => {
    // remark-directive parses the fence `{#id .big cols=2}` into attributes; the
    // handler reads them to shape the BemNode (e.g. a grid's column count).
    let seenAttrs: Record<string, string> | undefined;
    const mappings = new Map<string, import('../env/env.js').DirectiveHandler>([
        ['grid', (node) => {
            seenAttrs = node.attributes;
            return { block: 'grid', tag: 'div' };
        }],
    ]);
    mdToHtml(':::grid{#id .big cols=2}\n\nx\n\n:::\n', { directiveMappings: mappings });
    assert.equal(seenAttrs?.id, 'id');
    assert.equal(seenAttrs?.class, 'big');
    assert.equal(seenAttrs?.cols, '2');
});

test('postprocess: meaningful whitespace inside code/pre is preserved (Wave B)', () => {
    // The whitespace/typography regexes in postprocessHtml historically
    // collapsed double spaces and `-> ` inside <pre>/<code> — silently
    // corrupting diffs, ASCII diagrams and indentation.
    const cases = [
        '<pre>a  b</pre>',
        '<code>a  b</code>',
        '<pre>-> ok</pre>',
        '<pre>x\n\n\ny</pre>',
        '<pre>a <br>  b</pre>',
    ];
    for (const html of cases) {
        assert.equal(postprocessHtml(html), html);
    }
});

test('postprocess: authored prose whitespace is preserved without typography extension', () => {
    const out = postprocessHtml('<p>a  b</p>');
    assert.equal(out, '<p>a  b</p>');
});

test('relative download links point at the flat artifact root where the assets stage copies them', () => {
    const downloads = { 'tool.zip': 'external/docs/docs/files/tool.zip', 'manual.pdf': 'external/docs/manual.pdf', 'setup.ini': 'external/docs/docs/setup.ini', 'my#a.zip': 'external/docs/docs/my#a.zip' };
    const md = createMarkdown({ sourceFile: 'docs/guide.md', inputPath: './external/docs/docs/guide.md', downloads, md2url: { 'docs/guide.md': '/docs/guide' }, currentUrl: '/docs/guide' });
    const html = render(md.render('[tool](files/tool.zip) [manual](../manual.pdf) [cfg](setup.ini?v=2) [hash](my%23a.zip)').tree, { templates: markdownCollection() });
    assert.ok(html.includes('href=/tool.zip>'), html);
    assert.ok(html.includes('href=/manual.pdf>'), html);
    assert.ok(html.includes('href="/setup.ini?v=2"') || html.includes('href=/setup.ini?v=2>'), html);
    assert.ok(html.includes('href=/my%23a.zip>'), html);
});

test('relative download links fail when the assets stage did not publish that exact file', () => {
    const render = (link: string, downloads: Record<string, string>) => createMarkdown({ inputPath: './content/guide.md', downloads }).render(`[file](${link})`);
    assert.throws(() => render('manual.pdf', {}), /points to content\/manual\.pdf, but no external repository provides it/);
    assert.throws(() => render('manual.pdf', { 'manual.pdf': 'external/other/manual.pdf' }), /comes from external\/other\/manual\.pdf/);
    assert.doesNotThrow(() => render('manual.pdf', { 'manual.pdf': 'content/manual.pdf' }));
});
