/**
 * Tests for @nuckty/ext-block-root (openspec `ext-block-root`):
 * - `register(env)` adds the package's `blocks/` directory as a level;
 * - the `root` block wraps `{ block: 'root', props, content }` into an HTML
 *   document exactly once: `lang` from props, `<title>`/viewport from
 *   `props.page`, hreflang `<link>` from `props.alternates` (a Map), and the
 *   markdown tree inside `<body>`;
 * - without props the template does not fire (`.when(n => n.props)`), so a
 *   bare `root` node passes through unwrapped.
 *
 * @module test/root
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NucktyEnv, Templates, render, runWithTemplates } from '@nuckty/core';
import type { DocumentData } from '@nuckty/core';
import { register as registerExtension } from '../index.js';
import templates from '../../blocks/root/root.nu.ts';

/** Load the root declarations into a fresh template collection. */
function makeTemplates(): Templates {
    const templateSet = new Templates();

    runWithTemplates(templateSet, templates);

    return templateSet;
}

function data(title: string, lang?: string): DocumentData {
    const result: DocumentData = {
        page: {
            file: 'docs.md',
            url: '/docs',
            name: 'Docs',
            title,
            section: null,
            breadcrumbs: [],
        },
        content: 'Hello',
        sitemap: { sitemap: [], pages: {}, md2url: {}, md2urls: {}, url2md: {} },
        assets: { css: {}, js: {}, images: {}, videos: {} },
        alternates: new Map(),
    };

    if (lang) result.lang = lang;

    return result;
}

test('register adds the package blocks/ directory as a level', () => {
    const env = new NucktyEnv();
    registerExtension(env);
    const levels = env.levels.list();
    assert.equal(levels.length, 1);
    assert.ok(levels[0]!.endsWith('/blocks/'), `level points at blocks/, got ${levels[0]}`);
});

test('register supplies a document handler that selects the root block', async () => {
    const env = new NucktyEnv();

    registerExtension(env);

    assert.deepEqual(await env.document.render(data('Docs')), {
        block: 'root',
        props: { ...data('Docs') },
        content: 'Hello',
    });
});

test('root wraps page content into an html document with head data from props', () => {
    const templateSet = makeTemplates();
    const html = render({
        block: 'root',
        props: {
            ...data('Docs | Site', 'ru'),
            alternates: new Map([['en', { url: 'https://example.com/docs', title: 'Docs', host: 'example.com' }]]),
        },
        content: [{ block: 'article', elem: 'paragraph', tag: 'p', content: 'Hello' }],
    }, { templates: templateSet, document: true });

    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes('<html lang=ru>'));
    assert.ok(html.includes('<title>Docs | Site</title>'));
    assert.ok(html.includes('name=viewport'));
    assert.ok(html.includes('<link rel=alternate hreflang=en href=https://example.com/docs>'));
    assert.ok(html.includes('article__paragraph'));
    // Optional document closers are omitted; the wrap fires once.
    assert.ok(!html.includes('</html>'));
    assert.ok(!html.includes('</body>'));
    assert.equal(html.match(/<html/g)!.length, 1);
});

test('root defaults to lang=en and omits absent bundles and alternates', () => {
    const templateSet = makeTemplates();
    const html = render({
        block: 'root',
        props: { ...data('Bare') },
        content: 'Text',
    }, { templates: templateSet });

    assert.ok(html.includes('<html lang=en>'));
    assert.ok(html.includes('<title>Bare</title>'));
    assert.ok(!html.includes('stylesheet'));
    assert.ok(!html.includes('<script'));
    assert.ok(!html.includes('hreflang'));
});

test('root without props stays unwrapped (when-predicate guards the template)', () => {
    const templateSet = makeTemplates();
    const html = render({ block: 'root', content: 'Text' }, { templates: templateSet });
    assert.ok(!html.includes('<html'));
});

test('root loads each supplied CSS and deferred JS URL once in insertion order', () => {
    const props = data('Assets');
    const asset = (url: string) => ({ url, filename: url.slice(1), hash: 'fixture', source: [] });
    props.assets.css = { first: asset('/first.css'), duplicate: asset('/first.css'), empty: asset(''), second: asset('/second.css') };
    props.assets.js = { first: asset('/first.js'), duplicate: asset('/first.js'), empty: asset(''), second: asset('/second.js') };
    const html = render({ block: 'root', props: { ...props }, content: 'body-fixture' }, { templates: makeTemplates() });

    assert.equal(html.match(/href=\/first.css/g)?.length, 1);
    assert.equal(html.match(/src=\/first.js/g)?.length, 1);
    assert.ok(html.includes('<link rel=stylesheet href=/first.css>'));
    assert.ok(html.includes('<script src=/first.js defer></script>'));
    assert.ok(html.indexOf('/first.css') < html.indexOf('/second.css'));
    assert.ok(html.indexOf('/first.js') < html.indexOf('/second.js'));
    assert.ok(html.indexOf('body-fixture') < html.indexOf('/first.js'));
    assert.ok(!html.includes('href=""'));
    assert.ok(!html.includes('src=""'));
});
