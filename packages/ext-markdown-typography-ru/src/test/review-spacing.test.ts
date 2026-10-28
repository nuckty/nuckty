import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRussianTypography } from '../index.js';
import { createMarkdown, render, Templates } from '@nuckty/core';
import { remarkTypographyRu } from '../index.js';

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
    const html = render(parser.render('слово\u00a0—[ссылка](/x) и `код — без замен`').tree, { templates: new Templates() });

    assert(html.includes('слово\u00a0— <a'));
    assert(html.includes('код — без замен'));
});
