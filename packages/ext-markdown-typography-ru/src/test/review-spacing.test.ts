import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRussianTypography } from '../index.js';
import { createMarkdown, render, Templates, markdownTemplates, runWithTemplates } from '@nuckty/core';
import { remarkTypographyRu } from '../index.js';

/** A template collection with the default Markdown templates. */
function withMarkdown(): Templates {
    const templates = new Templates();

    runWithTemplates(templates, markdownTemplates);

    return templates;
}

test('horizontal em-dash spacing converges from NBSP, tabs and repeated spaces', () => {
    const canonical = 'слово\u00a0— текст';

    for (const before of ['', ' ', '  ', '\t', '\u00a0']) {
        for (const after of ['', ' ', '  ', '\t', '\u00a0']) {
            const source = `слово${before}—${after}текст`;

            assert.equal(applyRussianTypography(source), canonical, JSON.stringify(source));
            assert.equal(applyRussianTypography(applyRussianTypography(source)), canonical);
        }
    }
});

test('line boundaries, dialogue indentation and numeric ranges remain authored', () => {
    for (const source of ['— Диалог', '  — Диалог', 'слово\n—текст', 'слово\r\n—текст', '1—2']) {
        assert.equal(applyRussianTypography(source), source);
    }
});

test('Markdown link and literal-code spacing survive the typography bridge', () => {
    const parser = createMarkdown({ remarkPlugins: [remarkTypographyRu] });
    const html = render(parser.render('слово\u00a0—[ссылка](/x) и `код — без замен`').tree, { templates: withMarkdown() });

    assert(html.includes('слово\u00a0— <a'));
    assert(html.includes('код — без замен'));
});

test('a dash after inline markup gets a non-breaking space before it', () => {
    const parser = createMarkdown({ remarkPlugins: [remarkTypographyRu] });
    const html = render(parser.render('[ссылка](/x) — описание, *слово*  —текст, `код` — после кода\\\n— реплика').tree, { templates: withMarkdown() });

    assert(html.includes('</a>\u00a0— описание'));
    assert(html.includes('</em>\u00a0— текст'));
    assert(html.includes('</code>\u00a0— после кода'));
    assert(/<br>\n?— реплика/.test(html), html);
});
