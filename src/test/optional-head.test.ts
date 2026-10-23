import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToHtml } from '../bem/render-to-html.js';
import type { BemNode, BEMTree } from '../bem/types.js';

function documentWithHead(head: BemNode): string {
    return renderToHtml({
        tag: 'html',
        attrs: { lang: 'en' },
        content: [head, { tag: 'body', attrs: { class: 'page' }, content: 'Body' }],
    }, { document: true });
}

const meta: BemNode = { tag: 'meta', attrs: { charset: 'utf-8' } };

test('HTML5 head start is omitted before an element through empty positions and fragments', () => {
    const contents: BEMTree[] = [
        meta,
        ['', null, false, undefined, [meta]],
        { tag: false, content: [{ tag: false, content: meta }] },
        [{ raw: '' }, meta],
    ];

    for (const content of contents) {
        assert.equal(documentWithHead({ tag: 'head', content }), '<!doctype html><html lang=en><meta charset=utf-8><body class=page>Body\n\n');
    }
    assert.equal(documentWithHead({ tag: 'HEAD', content: meta }), '<!doctype html><html lang=en><meta charset=utf-8><body class=page>Body\n\n');
});

test('HTML5 head start is omitted for an empty head and non-emitted attributes', () => {
    for (const content of [undefined, null, false, '', [], { raw: '' }] satisfies BEMTree[]) {
        assert.equal(documentWithHead({ tag: 'head', content }), '<!doctype html><html lang=en><body class=page>Body\n\n');
    }
    assert.equal(documentWithHead({ tag: 'head', attrs: { id: null, hidden: false }, content: meta }), '<!doctype html><html lang=en><meta charset=utf-8><body class=page>Body\n\n');
});

test('head start retains emitted attributes, explicit classes and BEM metadata', () => {
    const heads: BemNode[] = [
        { attrs: { id: '' } },
        { cls: 'metadata' },
        { block: 'metadata' },
        { mix: 'metadata' },
        { block: 'metadata', js: true },
    ];

    for (const head of heads) {
        assert.match(documentWithHead({ tag: 'head', content: meta, ...head }), /<head\s/);
    }
});

test('head start preserves initial text, whitespace and opaque raw content', () => {
    for (const first of [' ', '\n', 'text', { raw: '<!--keep-in-head-->' }, { raw: '<meta name=custom>' }] satisfies BEMTree[]) {
        assert.ok(documentWithHead({ tag: 'head', content: [first, meta] }).startsWith('<!doctype html><html lang=en><head>'));
    }
});

test('head start remains explicit outside an HTML document-parent context', () => {
    const head: BemNode = { tag: 'head', content: meta };

    assert.ok(renderToHtml(head).startsWith('<head>'));
    assert.ok(renderToHtml({ tag: 'div', content: head }).startsWith('<div><head>'));
    assert.ok(renderToHtml({ tag: 'svg', content: { tag: 'html', content: head } }).startsWith('<svg><html><head>'));
});

test('omitting head start preserves a required head end before whitespace or comments', () => {
    for (const following of [' ', { raw: '<!--outside-head-->' }] satisfies BEMTree[]) {
        const output = renderToHtml({ tag: 'html', content: [{ tag: 'head', content: meta }, following, { tag: 'body', content: 'Body' }] });

        assert.ok(output.startsWith('<html><meta charset=utf-8></head>'), output);
    }
});
