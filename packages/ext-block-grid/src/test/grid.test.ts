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
import { NucktyEnv, Templates, createMarkdown, render, runWithTemplates, markdownTemplates } from '@nuckty/core';
import { register as registerExtension, gridHandler } from '../index.js';
import { extractItems, gridNode } from '../grid.js';
import type { MdastNode } from '../grid.js';
import gridTemplates from '../../blocks/grid/grid.nu.ts';

/** A template collection with the default Markdown templates. */
function withMarkdown(): Templates {
    const templates = new Templates();

    runWithTemplates(templates, markdownTemplates);

    return templates;
}

function paragraph(...children: MdastNode[]): MdastNode {
    return { type: 'paragraph', children };
}

test('extractItems keeps the inline children of paragraphs with text or an image', () => {
    const image: MdastNode = { type: 'image', url: 'a.png', alt: '' };
    const link: MdastNode = { type: 'link', url: '/x', children: [{ type: 'text', value: 'L' }] };
    const items = extractItems([
        paragraph({ type: 'text', value: 'A' }),
        paragraph({ type: 'text', value: '  ' }),
        paragraph(image),
        paragraph(link),
    ]);
    assert.deepEqual(items, [[{ type: 'text', value: 'A' }], [image], [link]]);
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
    const convert = { inline: (children: unknown[]) => children.length ? 'cell' : '', blocks: () => [] };
    const withItems = gridHandler({ type: 'containerDirective', name: 'grid', children: [paragraph({ type: 'text', value: 'Cell' })] }, {}, convert);
    assert.ok(withItems);
    assert.equal((withItems as { block?: string }).block, 'grid');

    const empty = gridHandler({ type: 'containerDirective', name: 'grid', children: [] }, {}, convert);
    assert.equal(empty, null);
});

test('register adds the blocks level and maps the grid directive', () => {
    const env = new NucktyEnv();
    registerExtension(env);

    const levels = env.levels.list();
    assert.equal(levels.length, 1);
    assert.ok(levels[0]!.endsWith('/blocks/'), `level points at blocks/, got ${levels[0]}`);
    assert.equal(env.markdown.directiveMappings().get('grid'), gridHandler);
});

test('grid block templates render the tree with escaped item text', () => {
    const templateSet = withMarkdown();

    runWithTemplates(templateSet, gridTemplates);

    const html = render(gridNode(['First', 'A & B']), { templates: templateSet });
    assert.ok(html.includes('class=grid'));
    assert.ok(html.includes('grid__item'));
    assert.ok(html.includes('First'));
    assert.ok(html.includes('A &amp; B'));
});

test('grid cells render links, emphasis, code and images like paragraphs and reject other blocks', () => {
    const env = new NucktyEnv();
    registerExtension(env);
    const templateSet = withMarkdown();
    runWithTemplates(templateSet, gridTemplates);
    const parser = createMarkdown({ directiveMappings: env.markdown.directiveMappings(), imageMapping: { 'logo.png': 'abcdef0123456789.png' }, sourceFile: 'index.md' });
    const html = render(parser.render(':::grid\n![Logo](logo.png)\n\n[Docs](https://example.com/docs) and *em* `code`\n:::').tree, { templates: templateSet });

    assert.match(html, /grid__item><img [^>]*src=\/abcdef0123456789\.png alt=Logo>/);
    assert.doesNotMatch(html, /!\[Logo\]/);
    assert.match(html, /<a [^>]*href=https:\/\/example\.com\/docs>Docs<\/a> and <em>em<\/em> <code/);
    assert.throws(() => extractItems([paragraph({ type: 'text', value: 'Cell' }), { type: 'list', children: [] }]), /Grid supports paragraph cells only; received list/);
});

test('leaf and text grid directives fall back to plain content instead of failing the build', () => {
    const env = new NucktyEnv();
    registerExtension(env);
    const parser = createMarkdown({ directiveMappings: env.markdown.directiveMappings() });
    const html = render(parser.render('Текст :grid[в строке] и\n\n::grid[лист]\n\n:::grid\nячейка\n:::').tree, { templates: withMarkdown() });

    assert.match(html, /в строке/);
    assert.match(html, /лист/);
    assert.match(html, /grid__item/);
});

test('cells holding only a reference image or inline img HTML are kept', () => {
    const env = new NucktyEnv();
    registerExtension(env);
    const templateSet = withMarkdown();
    runWithTemplates(templateSet, gridTemplates);
    const parser = createMarkdown({ directiveMappings: env.markdown.directiveMappings(), imageMapping: { 'logo.png': 'abcdef0123456789.png' }, sourceFile: 'index.md' });
    const html = render(parser.render(':::grid\n![Logo][logo]\n\n<img src="x.png" alt="X">\n:::\n\n[logo]: logo.png\n').tree, { templates: templateSet });

    assert.equal(html.match(/grid__item/g)?.length, 2, html);
    assert.match(html, /src=\/abcdef0123456789\.png alt=Logo/);
});
