/**
 * Tests for the Cyrillic-preserving slugify (openspec `markdown` spec: heading
 * anchors). `createSlugify` keeps Cyrillic letters and collapses separators;
 * `createGitHubSlug`/`createGitHubSlugify` are the flatter GitHub-style variant
 * (slashes dropped, not replaced); `cleanHeadingText` strips numbered prefixes.
 * These are non-trivial: the anchor map keys source links resolve against come
 * from these functions, so a wrong slug breaks every cross-doc `#anchor`.
 *
 * @module test/slugify
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    createSlugify,
    createGitHubSlug,
    createGitHubSlugify,
    cleanHeadingText,
    slugify,
} from '../markdown/slugify.js';

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

// ---- createGitHubSlugify (slashes dropped, not replaced) --------------------

test('createGitHubSlugify drops slashes entirely (no separator inserted)', () => {
    // Differs from createSlugify: `/` → `` not `-`, so a heading with a slash
    // yields a flat key matching the hierarchical anchor's section prefix join.
    assert.equal(createGitHubSlugify()('a/b'), 'ab');
    assert.equal(createGitHubSlugify()('раздел/экран'), 'разделэкран');
    assert.equal(createGitHubSlugify()('a b/c'), 'a-bc');
});

test('createGitHubSlugify keeps Cyrillic and dots', () => {
    const g = createGitHubSlugify();
    assert.equal(g('Версия 2.4.3'), 'версия-2.4.3');
    assert.equal(g('Что это?'), 'что-это');
});

// ---- cleanHeadingText (strip numbered prefixes and tags) --------------------

test('cleanHeadingText strips HTML tags', () => {
    assert.equal(cleanHeadingText('<b>Bold</b>'), 'Bold');
    assert.equal(cleanHeadingText('a <em>em</em> b'), 'a em b');
});

test('cleanHeadingText strips a leading numbered prefix like "1.2.3. "', () => {
    assert.equal(cleanHeadingText('1.2.3. Раздел'), 'Раздел');
    assert.equal(cleanHeadingText('12. Настройка'), 'Настройка');
});

test('cleanHeadingText preserves a version number that is the whole text', () => {
    // "2.4.3" with no trailing ". " + text is a version, not a numbered prefix.
    assert.equal(cleanHeadingText('2.4.3'), '2.4.3');
    assert.equal(cleanHeadingText('Версия 2.4.3'), 'Версия 2.4.3');
});

test('cleanHeadingText trims surrounding whitespace', () => {
    assert.equal(cleanHeadingText('  Заголовок  '), 'Заголовок');
});
