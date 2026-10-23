import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';
import type { BEMTree } from '../bem/types.js';

const templates = new Templates();
const paragraph = { tag: 'p', content: 'first' };
const html = (tree: BEMTree, document = false): string => render(tree, { templates, document });

test('paragraph end tag is omitted before the article closes', () => {
    assert.equal(html({ tag: 'article', content: paragraph }), '<article><p>first</article>');
});

test('paragraph closes implicitly before every permitted HTML successor', () => {
    const successors = ['address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl',
        'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'table', 'ul'];

    for (const tag of successors) {
        assert.ok(html({ tag: 'div', content: [paragraph, { tag }] }).startsWith(`<div><p>first<${tag}>`), tag);
    }
});

test('trailing paragraph end tag is omitted in ordinary HTML parents', () => {
    for (const tag of ['article', 'div', 'section', 'main', 'blockquote', 'li', 'dd', 'td', 'figcaption', 'body']) {
        assert.ok(!html({ tag, content: paragraph }).includes('</p>'), tag);
    }
});

test('excluded HTML parents and custom elements retain the paragraph close', () => {
    for (const tag of ['a', 'audio', 'del', 'ins', 'map', 'noscript', 'video', 'x-card']) {
        assert.equal(html({ tag, content: paragraph }), `<${tag}><p>first</p></${tag}>`, tag);
    }
});

test('inline, text, whitespace and opaque raw successors retain their sibling boundary', () => {
    for (const sibling of [{ tag: 'span', content: 'after' }, 'after', ' ', { raw: '<!-- after -->' }, { raw: '<div>after</div>' }]) {
        assert.ok(html({ tag: 'div', content: [paragraph, sibling] }).startsWith('<div><p>first</p>'));
    }
});

test('resolved tags and nested fragments participate in paragraph lookahead', () => {
    const rules = new Templates();
    rules.add({ block: 'next', modes: { tag: 'h2' } });
    const tree: BEMTree = { tag: 'div', content: [paragraph, [null, { tag: false, content: [false, { block: 'next', content: 'after' }] }]] };

    assert.equal(render(tree, { templates: rules }), '<div><p>first<h2 class=next>after</h2></div>');
    assert.equal(html({ tag: 'ARTICLE', content: { tag: 'P', content: 'first' } }), '<ARTICLE><P>first</ARTICLE>');
});

test('unknown fragment parent and foreign parents retain the paragraph close', () => {
    assert.equal(html(paragraph), '<p>first</p>');
    assert.equal(html({ tag: 'svg', content: { tag: 'foreignObject', content: paragraph } }), '<svg><foreignObject><p>first</p></foreignObject></svg>');
    assert.equal(html({ tag: 'svg', content: [paragraph, { tag: 'div' }] }), '<svg><p>first</p><div></div></svg>');
    assert.equal(html({ tag: 'math', content: { tag: 'mtext', content: paragraph } }), '<math><mtext><p>first</p></mtext></math>');
});

test('document newlines stay outside the final body paragraph', () => {
    const body = { tag: 'body', content: paragraph };

    assert.equal(html(body), '<body><p>first');
    assert.equal(html(body, true), '<!doctype html><body><p>first</p>\n\n');
    assert.equal(html({ tag: 'html', content: body }, true), '<!doctype html><html><body><p>first</p>\n\n');
    assert.equal(html({ tag: 'body', content: { tag: 'article', content: paragraph } }, true), '<!doctype html><body><article><p>first</article>\n\n');
});
