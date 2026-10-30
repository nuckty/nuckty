/**
 * Tests for the two-pass render (openspec `templates` spec): `renderToBemJson`
 * (templates → resolved tree) and `renderToHtml` (resolved tree → minimal HTML),
 * the `render` overload with `output: 'bemjson'`, and scoped `block()` declarations.
 * The tests exercise control-mode BEM-inheritance (a wrap result must NOT inherit the
 * source block's class), pass independence (pass 1 ≠ pass 2 output), and the
 * block selectors that match layout roots without leaking into named elements.
 *
 * @module test/render
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { block, createBlockFor } from '../bem/api.js';
import { runWithTemplates } from '../bem/template-context.js';
import { Templates } from '../bem/templates.js';
import { render, renderToBemJson, renderToHtml } from '../bem/render.js';
import type { BemNode, BEMTree } from '../bem/types.js';

function withTemplates(fn: () => void, tree: BemNode, opts: { document?: boolean; output?: 'html' | 'bemjson' } = {}): string | BEMTree {
    const reg = new Templates();
    runWithTemplates(reg, fn);
    return opts.output === 'bemjson'
        ? render(tree, { templates: reg, ...opts, output: 'bemjson' })
        : render(tree, { templates: reg, ...opts, output: 'html' });
}

test('renderToBemJson applies templates and returns a tree (no HTML)', () => {
    const reg = new Templates();
    runWithTemplates(reg, () => {
        block('menu')({ tag: 'ul' });
        block('menu').elem('item')({ tag: 'li' });
    });
    const tree = renderToBemJson(
        { block: 'menu', content: [{ block: 'menu', elem: 'item' }, { block: 'menu', elem: 'item' }] },
        { templates: reg },
    ) as BemNode;
    // Pass 1 output is structural: tags resolved, no serialization, no closing tags.
    assert.deepEqual(tree, {
        block: 'menu',
        tag: 'ul',
        content: [
            { block: 'menu', elem: 'item', tag: 'li' },
            { block: 'menu', elem: 'item', tag: 'li' },
        ],
    });
});

test('renderToHtml serializes a resolved tree with optional-tag omission', () => {
    // A pre-resolved tree uses HTML item-end omission before peers and at the tail.
    const resolved: BemNode = {
        tag: 'ul',
        block: 'article',
        elem: 'list',
        content: [
            { tag: 'li', block: 'article', elem: 'list-item', content: 'a' },
            { tag: 'li', block: 'article', elem: 'list-item', content: 'b' },
            { tag: 'li', block: 'article', elem: 'list-item', content: 'c' },
        ],
    };
    const html = renderToHtml(resolved);
    assert.equal(html, '<ul class=article__list><li class=article__list-item>a<li class=article__list-item>b<li class=article__list-item>c</ul>');
});

test('passes are independent: renderToHtml on a raw tree applies no templates', () => {
    // A raw (unresolved) tree passed straight to pass 2 keeps the source tag
    // (`div` default) — templates are pass 1's job, not pass 2's.
    const html = renderToHtml({ block: 'menu', content: [{ block: 'menu', elem: 'item' }] });
    assert.equal(html, '<div class=menu><div class=menu__item></div></div>');
});

test('render(tree, { output: "bemjson" }) stops after pass 1', () => {
    const reg = new Templates();
    runWithTemplates(reg, () => {
        block('menu')({ tag: 'ul' });
    });
    const tree = render({ block: 'menu' }, { templates: reg, output: 'bemjson' }) as BemNode;
    assert.deepEqual(tree, { block: 'menu', tag: 'ul' });
    // And the default (no output) still returns an HTML string.
    assert.equal(render({ block: 'menu' }, { templates: reg }), '<ul class=menu></ul>');
});

test('wrap result does NOT inherit the source block (BEM-inheritance guard)', () => {
    // A layout-style wrap: `{ block: 'page', props, content }` → the block's
    // `wrap` returns a fresh `<html>` document. The document's children the
    // wrap *introduces* (`<head>`, `<meta>`, …) must NOT pick up `class=page`
    // from the source node — they have no block of their own, and a control
    // mode's result does not inherit the source block. But a child that *does*
    // carry the block (`<body block='page'>`) re-establishes the context, so its
    // own children inherit `page` again — that is correct BEM, not the regression.
    // The regression this guards broke site-nuckty when layouts moved to
    // block().wrap: every `<meta class=page>` appeared.
    const html = withTemplates(() => {
        block('page').when((n) => Boolean(n.props)).wrap((n) => ({
            tag: 'html',
            content: [
                { tag: 'head', content: [{ tag: 'meta', attrs: { charset: 'utf-8' } }] },
                { tag: 'body', block: 'page', content: n.content },
            ],
        }));
    }, { block: 'page', props: { page: { title: 'x' } }, content: [{ tag: 'p', content: 'hi' }] }) as string;
    assert.ok(html.startsWith('<meta charset=utf-8>'), html);
    // Introduced children of the controlled result do NOT inherit the source block.
    assert.ok(!html.includes('<meta class=page'), `meta must not inherit page class: ${html}`);
    assert.ok(!html.includes('<head class=page'), `head must not inherit page class: ${html}`);
    // A child that re-declares the block re-establishes context for its subtree.
    assert.ok(html.includes('<body class=page>'), html);
    // `p` has no block of its own and sits under `body block='page'` → inherits page.
    assert.ok(html.includes('<p class=page>hi'), html);
});

test('a block wrap declaration matches the layout root without element guards', () => {
    // Named elements remain independent even when they carry layout-like props.
    const reg = new Templates();
    let wrapCalls = 0;

    runWithTemplates(reg, () => {
        block('page').wrap((n) => {
            wrapCalls++;
            return { tag: 'html', content: [{ tag: 'body', block: 'page', content: n.content }] };
        });
    });
    const tree: BemNode = {
        block: 'page',
        props: { page: { title: 'root' } },
        content: [
            { tag: 'div', block: 'page', elem: 'main', props: { page: { title: 'child' } }, content: [{ tag: 'p', content: 'x' }] },
        ],
    };
    const html = render(tree, { templates: reg });
    assert.equal(wrapCalls, 1, 'wrap fires only on the block root, not on page__main');
    // `page__main` has no trigger chars → unquoted class (same rule as elsewhere).
    assert.ok(html.includes('<div class=page__main>'), 'page__main renders with its own class');
    assert.ok(!html.includes('<div class="page__main page">'), 'no inherited page class on page__main');
    assert.ok(!html.includes('<div class=page__main page>'), 'no inherited page class on page__main');
});

test('block() outside template loading fails clearly', () => {
    assert.throws(() => block('page')({ tag: 'main' }), /only be called while loading templates/);
});

test('parallel template contexts remain isolated', async () => {
    const templatesA = new Templates();
    const templatesB = new Templates();

    await Promise.all([
        runWithTemplates(templatesA, async () => {
            await Promise.resolve();
            block('x')({ tag: 'a' });
        }),
        runWithTemplates(templatesB, async () => {
            await Promise.resolve();
            block('x')({ tag: 'b' });
        }),
    ]);

    assert.equal(render({ block: 'x' }, { templates: templatesA }), '<a class=x></a>');
    assert.equal(render({ block: 'x' }, { templates: templatesB }), '<b class=x></b>');
});

test('createBlockFor produces a block bound to specific templates', () => {
    const regA = new Templates();
    const regB = new Templates();
    const blockA = createBlockFor(regA);
    const blockB = createBlockFor(regB);
    blockA('x')({ tag: 'a' });
    blockB('x')({ tag: 'b' });
    assert.equal(render({ block: 'x' }, { templates: regA }), '<a class=x></a>');
    assert.equal(render({ block: 'x' }, { templates: regB }), '<b class=x></b>');
});

test('document render prepends doctype and appends the trailing blank lines', () => {
    const html = withTemplates(() => {}, { tag: 'html', content: [{ tag: 'body', content: 'x' }] }, { document: true }) as string;
    // Attribute-free `<html>`/`<body>` tags and their end tags are omitted; doctype leads,
    // the document terminates with the canonical `\n\n`.
    assert.equal(html, '<!doctype html>x\n\n');
});
