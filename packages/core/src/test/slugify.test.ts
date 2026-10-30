/**
 * Tests for the Cyrillic-preserving slugify (openspec `markdown` spec: heading
 * anchors). `createSlugify` keeps Cyrillic letters and collapses separators;
 * `createGitHubSlug` is the flatter GitHub-style variant used for authored
 * links. These are non-trivial: the anchor map keys source links resolve against come
 * from these functions, so a wrong slug breaks every cross-doc `#anchor`.
 *
 * @module test/slugify
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSlugify, createGitHubSlug } from '../markdown/slugify.js';

const slugify = createSlugify();

// ---- createSlugify (Cyrillic-preserving, slashes → separator) ----------------

test('slugify keeps Cyrillic and Latin letters, digits, dots', () => {
    assert.equal(slugify('Разделение экрана'), 'разделение-экрана');
    assert.equal(slugify('Hello World'), 'hello-world');
    assert.equal(slugify('Версия 2.4.3'), 'версия-2.4.3');
});

test('slugify collapses whitespace and slashes to the separator', () => {
    assert.equal(slugify('a   b'), 'a-b');
    assert.equal(slugify('a/b'), 'a-b');
    assert.equal(slugify('a\\b'), 'a-b');
    assert.equal(slugify('a  /  b'), 'a-b');
});

test('slugify strips HTML tags and unwanted punctuation', () => {
    assert.equal(slugify('<b>Bold</b> heading'), 'bold-heading');
    assert.equal(slugify('Что это? — знак!'), 'что-это-знак');
    assert.equal(slugify('foo, bar; baz'), 'foo-bar-baz');
});

test('slugify strips the trailing dot of a numbered heading (keeps the number)', () => {
    // "12. Foo" → "12 Foo" (the dot after the number is a list marker, not a
    // version fragment) so the source link `#12-foo` resolves.
    assert.equal(slugify('12. Foo'), '12-foo');
    assert.equal(slugify('1.2.3 Раздел'), '1.2.3-раздел');
});

test('slugify trims and collapses repeated separators', () => {
    assert.equal(slugify('   a   b   '), 'a-b');
    // Leading/trailing separators are trimmed, runs collapsed.
    assert.equal(slugify('---a---b---'), 'a-b');
    assert.equal(slugify('a---b'), 'a-b');
});

test('createSlugify respects case and separator options', () => {
    const upper = createSlugify({ case: 'upper' });
    assert.equal(upper('раздел'), 'РАЗДЕЛ');
    const none = createSlugify({ case: 'none' });
    assert.equal(none('Раздел'), 'Раздел');
    const dot = createSlugify({ separator: '.' });
    assert.equal(dot('a b'), 'a.b');
    assert.equal(dot('a/b'), 'a.b');
});

// ---- createGitHubSlug (flat, slashes dropped entirely) -----------------------

test('createGitHubSlug lowercases and drops non-word chars except Cyrillic', () => {
    assert.equal(createGitHubSlug('Разделение экрана'), 'разделение-экрана');
    assert.equal(createGitHubSlug('Hello, World!'), 'hello-world');
    assert.equal(createGitHubSlug('12. Foo'), '12-foo');
});

test('createGitHubSlug keeps the numbered prefix source links carry', () => {
    // The anchor map stores `12-foo` for heading "12. Foo" so `#12-foo` resolves.
    assert.equal(createGitHubSlug('12. Настройка'), '12-настройка');
});

test('slugs keep letters of every script so sibling headings stay distinct', () => {
    assert.equal(slugify('Ελληνικά'), 'ελληνικά');
    assert.equal(slugify('概要'), '概要');
    assert.equal(slugify('Résumé'), 'résumé');
    assert.equal(slugify('Привет, мир'), 'привет-мир');
    assert.equal(createGitHubSlug('Ρυθμίσεις'), 'ρυθμίσεις');
});

test('sibling headings in non-Latin scripts build with distinct anchors', async () => {
    const { createMarkdown } = await import('../index.js');
    const result = createMarkdown().render('# Guide\n\n## 概要\n\n## 安装\n\n## Ελληνικά\n');

    assert.deepEqual(result.headings.slice(1).map((heading) => heading.anchor), ['guide-概要', 'guide-安装', 'guide-ελληνικά']);
});
