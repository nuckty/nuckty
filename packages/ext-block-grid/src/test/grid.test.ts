/**
 * Tests for @nuckty/ext-block-grid (openspec `ext-block-grid`):
 * - `extractItems` turns each non-empty paragraph child of the container into
 *   one item text (soft breaks kept, images flattened to `![]()` markdown,
 *   link text kept);
 * - `gridNode` wraps item texts into `grid__item` cells;
 * - `gridHandler` returns `null` for a container without items (plain content
 *   fallback) and the grid tree otherwise;
 * - `register` adds the `blocks/` level and maps the `grid` directive;
 * - the block templates render the tree (text is escaped by the serializer).
 *
 * @module test/grid
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NucktyEnv, Templates, render, runWithTemplates } from '@nuckty/core';
import { register as registerExtension, gridHandler } from '../index.js';
import { extractItems, gridNode } from '../grid.js';
import type { MdastNode } from '../grid.js';
import gridTemplates from '../../blocks/grid/grid.nu.ts';

function paragraph(...children: MdastNode[]): MdastNode {
    return { type: 'paragraph', children };
}

test('extractItems maps container paragraphs to item texts', () => {
    const children: MdastNode[] = [
        paragraph({ type: 'text' }, { type: 'break' }, { type: 'text' }),
        paragraph({ type: 'text' }),
        paragraph({ type: 'image', url: 'a.png', alt: 'A' }),
        paragraph({ type: 'link', children: [{ type: 'text', value: 'p3l0' }] }),
    ];
    const items = extractItems(children.map((p, i) => ({
        ...p,
        children: (p.children ?? []).map((c, j) => (c.type === 'text' ? { type: 'text', value: `p${i}l${j}` } : c)),
    })));
    assert.deepEqual(items, ['p0l0\np0l2', 'p1l0', '![A](a.png)', 'p3l0']);
});

test('gridNode wraps item texts into grid__item cells', () => {
    const node = gridNode(['First', 'Second & <third>']);
    assert.equal(node.block, 'grid');
    const items = node.content as import('@nuckty/core').BemNode[];
    assert.equal(items.length, 2);
    assert.equal(items[0]!.elem, 'item');
    assert.equal(items[0]!.content, 'First');
    assert.equal(items[1]!.content, 'Second & <third>');
});

test('gridHandler maps a container with items and falls back on an empty one', () => {
    const withItems = gridHandler({ name: 'grid', children: [paragraph({ type: 'text', value: 'Cell' })] }, undefined);
    assert.ok(withItems);
    assert.equal((withItems as { block?: string }).block, 'grid');

    const empty = gridHandler({ name: 'grid', children: [] }, undefined);
    assert.equal(empty, null);
});

test('register adds the blocks level and maps the grid directive', () => {
    const env = new NucktyEnv();
    registerExtension(env);

    const levels = env.levels.list();
    assert.equal(levels.length, 1);
    assert.ok(levels[0]!.endsWith('/blocks/'), `level points at blocks/, got ${levels[0]}`);
    assert.equal(env.markdown.directiveHandler('grid'), gridHandler);
});

test('grid block templates render the tree with escaped item text', () => {
    const templateSet = new Templates();

    runWithTemplates(templateSet, gridTemplates);

    const html = render(gridNode(['First', 'A & B']), { templates: templateSet });
    assert.ok(html.includes('class=grid'));
    assert.ok(html.includes('grid__item'));
    assert.ok(html.includes('First'));
    assert.ok(html.includes('A &amp; B'));
});

test('grid keeps text in all inline formatting and rejects mixed unsupported blocks', () => {
    const items = extractItems([paragraph(
        { type: 'strong', children: [{ type: 'text', value: 'KEEP' }] },
        { type: 'emphasis', children: [{ type: 'text', value: 'EM' }] },
        { type: 'inlineCode', value: 'CODE' },
        { type: 'delete', children: [{ type: 'text', value: 'DEL' }] },
    )]);
    assert.deepEqual(items, ['KEEPEMCODEDEL']);
    assert.throws(() => extractItems([paragraph({ type: 'text', value: 'Cell' }), { type: 'list', children: [] }]), /Grid supports paragraph cells only; received list/);
});
