import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdown } from '../markdown/index.js';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';

const NO_TEMPLATES = { templates: new Templates() };

function mdToHtml(src: string, opts: Parameters<typeof createMarkdown>[0] = {}): string {
    // Markdown-bridge contract only. Typography is an extension
    // (nuckty-ext-markdown-typography-ru) and is not applied here; tests that
    // assert typographic output live in the extension, mirroring how a consumer
    // registers it in `ext[]`.
    const { render: renderMd } = createMarkdown(opts);
    const { tree } = renderMd(src);
    return render({ block: 'article', content: tree }, NO_TEMPLATES);
}

test('heading: h1 with cyrillic anchor', () => {
    const html = mdToHtml('# Топливо');
    assert.equal(html, '<div class=article><h1 class="article__heading article__heading_level_1" id=топливо><a class=article__heading-anchor href=#топливо>Топливо</a></h1></div>');
});

test('heading: hierarchical h2 anchor', () => {
    const html = mdToHtml('# Free\n\n## Топливо\n');
    // h1 id=top (Free→free), h2 id=free-топливо
    assert.ok(html.includes('<h1 class="article__heading article__heading_level_1" id=free>'));
    assert.ok(html.includes('<h2 class="article__heading article__heading_level_2" id=free-топливо>'));
});

test('heading: custom anchor syntax {#id}', () => {
    const html = mdToHtml('# Section {#my-id}');
    assert.ok(html.includes('id=my-id'));
});

test('heading: duplicate id throws', () => {
    assert.throws(() => mdToHtml('# Same\n\n# Same\n'), /Duplicate heading ID/);
});

test('paragraph: basic text', () => {
    const html = mdToHtml('Hello world.');
    assert.equal(html, '<div class=article><p class=article__paragraph>Hello world.</div>');
});

test('list: unordered with items', () => {
    const html = mdToHtml('- a\n- b\n- c\n');
    // HTML permits omission before each next item and at the list tail.
    assert.ok(html.includes('<ul class=article__list>'));
    assert.ok(/<li class=article__list-item>a<li class=article__list-item>b<li class=article__list-item>c<\/ul>/.test(html));
});

test('list: ordered', () => {
    const html = mdToHtml('1. first\n2. second\n');
    assert.ok(html.includes('<ol class="article__list article__list_ordered">'));
});

test('list: paragraph wrapper skipped inside list item', () => {
    const html = mdToHtml('- item text\n');
    // No <p> wrapping inside <li>.
    assert.ok(html.includes('<li class=article__list-item>item text</ul>'));
    assert.ok(!html.includes('<p'));
});

test('code: fenced block', () => {
    const html = mdToHtml('```\ncode here\n```\n');
    assert.ok(html.includes('<pre class=article__code><code>code here\n</code><button type=button class=article__code-copy aria-label="Copy code to clipboard" title="Copy code"></button></pre>'));
});

test('code: inline', () => {
    const html = mdToHtml('Use `npm` to install.');
    assert.ok(html.includes('<code class="article__inline-code">npm</code>'));
});

test('link: external passes through', () => {
    const html = mdToHtml('[site](https://example.com)');
    assert.ok(html.includes('<a class=article__link href=https://example.com>site</a>'));
});

test('link: relative .md resolved via md2url', () => {
    const html = mdToHtml('[go](./other.md)', { md2url: { './other.md': '/other' } });
    assert.ok(html.includes('href=/other'));
});

test('link: anchor passthrough', () => {
    const html = mdToHtml('[jump](#section)');
    assert.ok(html.includes('href=#section'));
});

test('image: src rewritten via imageMapping', () => {
    const html = mdToHtml('![alt](img.png)', { imageMapping: { 'img.png': '/abc123.png' } });
    assert.ok(html.includes('<img class=article__image src=/abc123.png alt=alt>'));
});

test('image: title quoted when contains spaces', () => {
    const html = mdToHtml('![alt](img.png "A title")', { imageMapping: { 'img.png': '/x.png' } });
    assert.ok(html.includes('title="A title"'));
});

test('strong + em', () => {
    const html = mdToHtml('**bold** and *italic*');
    assert.ok(html.includes('<strong>bold</strong>'));
    assert.ok(html.includes('<em>italic</em>'));
});

test('hr', () => {
    const html = mdToHtml('---\n');
    assert.ok(html.includes('<hr>'));
});

test('blockquote', () => {
    const html = mdToHtml('> quoted text\n');
    assert.ok(html.includes('<blockquote class=article__blockquote>'));
});

test('table: header and body cells with BEM classes', () => {
    const html = mdToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
    assert.ok(html.includes('<table class=article__table>'));
    assert.ok(html.includes('<thead class=article__table-head>'));
    assert.ok(html.includes('<tbody class=article__table-body>'));
    assert.ok(html.includes('<th class="article__table-cell article__table-cell_header">'));
    assert.ok(html.includes('<td class=article__table-cell>'));
});

test('link: adjacent alphanumeric text keeps authored spacing', () => {
    const html = mdToHtml('text[link](/url)');
    assert.ok(html.includes('text<a class=article__link href=/url>link</a>'));
});

test('html block passes through raw', () => {
    const html = mdToHtml('<div class=custom>raw</div>');
    assert.ok(html.includes('<div class=custom>raw</div>'));
});

test('headings collected in result', () => {
    const { render } = createMarkdown();
    const { headings } = render('# One\n\n## Two\n');
    assert.equal(headings.length, 2);
    assert.equal(headings[0]!.level, 1);
    assert.equal(headings[0]!.anchor, 'one');
    assert.equal(headings[1]!.level, 2);
    assert.equal(headings[1]!.anchor, 'one-two');
});
test('Markdown tables keep ordinary output compact and close a header-only section', () => {
    const ordinary = mdToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
    const headerOnly = mdToHtml('| A | B |\n| --- | --- |\n');

    assert.match(ordinary, /<thead class=article__table-head>/);
    assert.match(ordinary, /<tbody class=article__table-body>/);
    assert.doesNotMatch(ordinary, /<\/(?:th|td|tr|thead|tbody)>/);
    assert.match(headerOnly, /<\/thead><\/table>/);
    assert.doesNotMatch(headerOnly, /<tbody/);
});

test('custom element names beginning with block names stay inside their paragraph', () => {
    for (const tag of ['pre-view', 'div-widget', 'p-note', 'h1-title']) {
        assert.equal(mdToHtml(`Text <${tag}>plain</${tag}>.`),
            `<div class=article><p class=article__paragraph>Text <${tag}>plain</${tag}>.</div>`);
    }
});
