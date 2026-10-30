import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdown } from '../markdown/remark.js';
import { createSlugify, createGitHubSlugify } from '../markdown/slugify.js';

for (const separator of ['', '--', '..', '.*', '$&', '🟢']) {
    test(`Markdown treats separator ${JSON.stringify(separator)} literally`, () => {
        const result = createMarkdown({ slugify: { separator } }).render('# Foo / bar__baz');

        assert.equal(result.headings[0]?.anchor, `foo${separator}bar${separator}baz`);
    });
}

test('separator normalization uses whole tokens and preserves helper slash policies', () => {
    assert.equal(createSlugify({ separator: '--' })('-- A// B__C --'), 'a--b--c');
    assert.equal(createGitHubSlugify({ separator: '--' })('-- A/B__C --'), 'ab--c');
    assert.equal(createSlugify({ separator: '', case: 'upper' })('A / B_Я'), 'ABЯ');
    assert.equal(createGitHubSlugify({ separator: '', case: 'none' })('A / B_Я'), 'ABЯ');
});

test('custom intra-heading separators keep the established hierarchy join', () => {
    const result = createMarkdown({ slugify: { separator: '::' } }).render('# Parent one\n\n## Child two');

    assert.deepEqual(result.headings.map(heading => heading.anchor), ['parent::one', 'parent::one-child::two']);
});

