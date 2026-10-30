/**
 * Tests for the Russian typography markdown-extension (openspec
 * `ext-markdown-typography-ru`): horizontal em-dash spacing and the mdast prose
 * transform. Code and raw literal content remain unchanged.
 *
 * @module test/typography
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import { applyRussianTypography, remarkTypographyRu } from '../index.js';

// ---- applyRussianTypography: 5 em-dash + nbsp patterns ----------------------

test('pattern 1: space — em dash — space → nbsp + dash + space', () => {
    assert.equal(applyRussianTypography('word — word'), 'word — word');
});

test('pattern 2: space — em dash — no space → nbsp + dash + space', () => {
    assert.equal(applyRussianTypography('word —word'), 'word — word');
});

test('pattern 3: no space — em dash — space → nbsp + dash + space', () => {
    assert.equal(applyRussianTypography('word— word'), 'word — word');
});

test('pattern 4: em dash between letters (no spaces) → nbsp + dash + space', () => {
    assert.equal(applyRussianTypography('word—word'), 'word — word');
});

test('pattern 5: em dash + misplaced nbsp normalizes to dash + regular space', () => {
    assert.equal(applyRussianTypography('word— word'), 'word — word');
});

test('applyRussianTypography is idempotent on its canonical form', () => {
    const canon = 'word — word';
    assert.equal(applyRussianTypography(canon), canon);
});

test('applyRussianTypography: empty/null/whitespace safe', () => {
    assert.equal(applyRussianTypography(''), '');
    assert.equal(applyRussianTypography('   '), '   ');
    // @ts-expect-error testing the runtime guard
    assert.equal(applyRussianTypography(null), null);
});

test('applyRussianTypography: no em dash → unchanged', () => {
    assert.equal(applyRussianTypography('plain text, no dash'), 'plain text, no dash');
});

// ---- remarkTypographyRu mdast plugin ----------------------------------------

/** Run the plugin's mdast transform on a parsed tree (the same way the unified
 *  pipeline does — via `runSync`, not a direct transformer call). */
function applyPlugin(tree: Root): Root {
    return unified().use(remarkTypographyRu).runSync(tree) as Root;
}

/** Parse + apply the plugin, collect text + html node values. */
function transform(src: string): { texts: string[]; htmls: string[] } {
    const tree = applyPlugin(unified().use(remarkParse).parse(src) as Root);
    const texts: string[] = [];
    const htmls: string[] = [];
    visit(tree, (node) => {
        if (node.type === 'text') {
            texts.push((node as Text).value);
        }
        if (node.type === 'html') {
            htmls.push((node as { value: string }).value);
        }
    });
    return { texts, htmls };
}

test('plugin: prose text node is typographied', () => {
    const { texts } = transform('word — word');
    assert.ok(texts.some((t) => t === 'word — word'), `got ${JSON.stringify(texts)}`);
});

test('plugin: raw HTML is preserved without touching prose or attributes inside it', () => {
    const raw = '<div title="A — B">\nслово — текст\n</div>';
    const { htmls } = transform(raw);
    assert.deepEqual(htmls, [raw]);
});

test('plugin: code is skipped structurally (no visit, no rewrite)', () => {
    // A fenced code block is a `code` mdast node, not `text`/`html` — the plugin
    // never visits it, so an em-dash inside code is left verbatim. This is the
    // reason the mdast plugin needs no placeholder protection.
    const tree = applyPlugin(unified().use(remarkParse).parse('```\nword — word\n```') as Root);
    let codeValue = '';
    visit(tree, 'code', (node) => { codeValue = (node as { value: string }).value; });
    assert.equal(codeValue, 'word — word');
});

test('plugin: inline code is skipped structurally', () => {
    const tree = applyPlugin(unified().use(remarkParse).parse('text `code — value` more') as Root);
    let inlineValue = '';
    visit(tree, 'inlineCode', (node) => { inlineValue = (node as { value: string }).value; });
    assert.equal(inlineValue, 'code — value');
});

test('plugin: prose around inline code is typographied, code is not', () => {
    const { texts } = transform('слово — `code — x` текст');
    const joined = texts.join('');
    assert.ok(joined.includes('слово —'), `prose typographied: ${JSON.stringify(joined)}`);
    assert.ok(!joined.includes('code —'), `inline code value leaked into text: ${JSON.stringify(joined)}`);
});
