/**
 * Integration tests for the Russian typography markdown-extension against the
 * nuckty markdown→BemNode bridge (openspec `ext-markdown-typography-ru` +
 * `markdown`): the extension's remark plugin is registered exactly the way a
 * consumer registers it (`remarkPlugins: [remarkTypographyRu]`), the markdown
 * is parsed into BemNode and rendered to HTML through the core engine, and the
 * em-dash typography survives the bridge in each context — prose, heading,
 * near a link — while code (fenced/inline) is left verbatim.
 *
 * These tests live in the extension (not the core) because typography is a
 * site concern: the core knows nothing about it (openspec `core`).
 *
 * @module test/typography-bridge
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdown, render, Templates, markdownTemplates, runWithTemplates } from '@nuckty/core';
import { remarkTypographyRu } from '../index.js';

/** A template collection with the default Markdown templates. */
function withMarkdown(): Templates {
    const templates = new Templates();

    runWithTemplates(templates, markdownTemplates);

    return templates;
}

const TEMPLATES = { templates: withMarkdown() };

/** Render markdown → BemNode → HTML with the typography plugin attached, the
 *  way a consumer wires it via `ext[]` → `env.markdown.use(remarkTypographyRu)`. */
function mdToHtml(src: string): string {
    const { render: renderMd } = createMarkdown({ remarkPlugins: [remarkTypographyRu] });
    const { tree } = renderMd(src);
    return render({ block: 'article', content: tree }, TEMPLATES);
}

test('bridge: prose em-dash gets nbsp before, regular space after', () => {
    const html = mdToHtml('Один — два');
    assert.ok(html.includes('Один\u00a0— два'));
});

test('bridge: em-dash inside a fenced code block is NOT typographied', () => {
    const html = mdToHtml('```\na — b\n```\n');
    assert.ok(html.includes('<code>a — b\n</code>'));
    assert.ok(!html.includes('a\u00a0— b</code>'));
});

test('bridge: em-dash inside a heading IS typographied', () => {
    const html = mdToHtml('# Заголовок — текст');
    assert.ok(html.includes('Заголовок\u00a0— текст'));
});

test('bridge: em-dash spacing before a link retains its ordinary trailing space', () => {
    const html = mdToHtml('слово — [link](/x)');
    assert.ok(html.includes('слово\u00a0— <a'));
});

test('bridge: nbsp before em-dash in real prose', () => {
    const md = 'eSender — это сервис виртуального китайского номера.';
    const html = mdToHtml(md);
    // Non-breaking space before the dash, regular space after.
    assert.ok(html.includes('eSender\u00a0— это'), 'nbsp + em-dash + space');
});

test('bridge: raw code, pre and attribute values are never typographied', () => {
    for (const raw of ['<pre class="x">A — B</pre>', '<code title="A — B">A — B</code>', '<span data-label="A — B">plain</span>']) {
        assert.ok(mdToHtml(raw).includes(raw));
    }
});

test('bridge: custom tags beginning with literal element names retain prose typography', () => {
    for (const tag of ['code-widget', 'pre-view', 'script-note', 'style-note']) {
        const html = mdToHtml(`Text <${tag}>слово — текст</${tag}>.`);

        assert.ok(html.includes(`<${tag}>слово\u00a0— текст</${tag}>`), html);
    }
});
