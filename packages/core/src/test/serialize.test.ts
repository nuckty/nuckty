/**
 * Tests for the base HTML serializer with quoted attributes. Verifies structure,
 * classes, attributes, void elements, raw pass-through and escaping.
 *
 * @module test/serialize
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize } from '../bem/html/serialize.js';

test('serialize: simple div with block class', () => {
    assert.equal(serialize({ block: 'page' }), '<div class="page"></div>');
});

test('serialize: tag override', () => {
    assert.equal(serialize({ block: 'menu', tag: 'ul' }), '<ul class="menu"></ul>');
});

test('serialize: tag:false renders only content', () => {
    assert.equal(serialize({ block: 'frag', tag: false, content: 'hi' }), 'hi');
});

test('serialize: nested content', () => {
    assert.equal(
        serialize({ block: 'page', content: { block: 'page', elem: 'main', content: 'x' } }),
        '<div class="page"><div class="page__main">x</div></div>',
    );
});

test('serialize: array content', () => {
    assert.equal(
        serialize({ block: 'row', content: [{ block: 'cell' }, 'text'] }),
        '<div class="row"><div class="cell"></div>text</div>',
    );
});

test('serialize: void element (img) has no closing tag', () => {
    assert.equal(
        serialize({ tag: 'img', attrs: { src: '/a.png', alt: '' } }),
        '<img src="/a.png" alt="">',
    );
});

test('serialize: br is void', () => {
    assert.equal(serialize({ tag: 'br' }), '<br>');
});

test('serialize: attrs with boolean values', () => {
    assert.equal(
        serialize({ tag: 'input', attrs: { type: 'checkbox', checked: true } }),
        '<input type="checkbox" checked>',
    );
});

test('serialize: attrs false/null dropped', () => {
    assert.equal(
        serialize({ tag: 'input', attrs: { a: null, b: false, c: 'x' } }),
        '<input c="x">',
    );
});

test('serialize: raw pass-through verbatim', () => {
    assert.equal(
        serialize({ block: 'wrap', raw: '<span>raw & unescaped</span>' }),
        '<span>raw & unescaped</span>',
    );
});

test('serialize: text cannot become markup; only raw nodes bypass escaping', () => {
    assert.equal(serialize('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
    assert.equal(serialize('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('serialize: attribute value with quotes is entity-escaped for parser round-trip (RENDER-01)', () => {
    // `"` inside a double-quoted attribute MUST be `&quot;` or the attribute
    // terminates early (`title="say "hi""` parsed as title="say " + junk).
    // The BEMJSON attr carries the LOGICAL value; the serializer encodes once.
    assert.equal(
        serialize({ tag: 'a', attrs: { title: 'say "hi"' } }),
        '<a title="say &quot;hi&quot;"></a>',
    );
});

test('serialize: attribute value with ampersand/entity-looking input keeps literal meaning', () => {
    // `&copy;` in an href would be parsed as the © entity; `&amp;copy;` keeps
    // the literal `&copy;` text — the logical value round-trips.
    assert.equal(
        serialize({ tag: 'a', attrs: { href: '/?a=&copy;' } }),
        '<a href="/?a=&amp;copy;"></a>',
    );
});

test('serialize: data-bem JSON is quote-escaped and JSON round-trips', () => {
    const html = serialize({ block: 'x', js: { a: '"quoted"' } });
    const m = html.match(/data-bem="([^"]*)"/);
    assert.ok(m, 'data-bem present: ' + html);
    // The parser side decodes &quot;/&amp; — JSON must survive that round-trip.
    const decoded = m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    assert.deepEqual(JSON.parse(decoded), { x: { a: '"quoted"' } });
});

test('serialize: safe token stays correct without excess escaping', () => {
    // The base serializer always quotes; no entity appears for a plain token.
    assert.equal(
        serialize({ tag: 'a', attrs: { href: '/x' } }),
        '<a href="/x"></a>',
    );
});

test('serialize: mods produce classes', () => {
    assert.equal(
        serialize({ block: 'btn', mods: { size: 'm' } }),
        '<div class="btn btn_size_m"></div>',
    );
});

test('serialize: elem inherits block context for children', () => {
    // elem-only node resolves to parent block; child block resets context.
    assert.equal(
        serialize({ block: 'page', content: { elem: 'inner' } }),
        '<div class="page"><div class="page__inner"></div></div>',
    );
});

test('serialize: null/false/undefined content empty', () => {
    assert.equal(serialize(null), '');
    assert.equal(serialize(false), '');
    assert.equal(serialize(undefined), '');
});
