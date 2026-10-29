import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdown, render, Templates } from '../index.js';
import type { DirectiveHandler } from '../index.js';

function parse(handler: DirectiveHandler, source: string, imageMapping: Record<string, string> = {}) {
    return createMarkdown({ directiveMappings: new Map([['box', handler]]), imageMapping, sourceFile: 'index.md' }).render(source);
}

test('a handler that converts children and then declines does not duplicate headings or anchors', () => {
    const result = parse((node, _env, convert) => {
        convert.blocks(node.children ?? []);
        return null;
    }, ':::box\n## Intro\n:::\n');

    assert.deepEqual(result.headings.map((heading) => heading.anchor), ['intro']);
    assert.match(render(result.tree, { templates: new Templates() }), /id=intro/);
});

test('convert.inline rejects block nodes and renders images with the page mapping', () => {
    assert.throws(() => parse((node, _env, convert) => ({ block: 'x', content: convert.inline(node.children ?? []) }), ':::box\nText\n:::\n'), /convert\.inline received block node paragraph; use convert\.blocks/);

    const result = parse((node, _env, convert) => {
        const paragraph = (node.children ?? [])[0] as { children: unknown[] };
        return { block: 'x', content: convert.inline(paragraph.children) };
    }, ':::box\n![Logo](logo.png)\n:::\n', { 'logo.png': 'abcdef0123456789.png' });

    assert.match(render(result.tree, { templates: new Templates() }), /<img [^>]*src=\/abcdef0123456789\.png alt=Logo>/);
});

test('handlers receive the directive form', () => {
    const forms: string[] = [];
    parse((node) => {
        forms.push(String(node.type));
        return null;
    }, 'a :box[t] b\n\n::box[l]\n\n:::box\nc\n:::\n');

    assert.deepEqual(forms.sort(), ['containerDirective', 'leafDirective', 'textDirective']);
});
