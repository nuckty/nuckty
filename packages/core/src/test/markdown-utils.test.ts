import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSlugify, slugify, cleanHeadingText } from '../markdown/slugify.js';
import { buildHierarchicalAnchor } from '../markdown/anchors.js';

// ---- slugify --------------------------------------------------------------

test('slugify: latin lowercased', () => {
    assert.equal(slugify('Hello World'), 'hello-world');
});

test('slugify: cyrillic preserved', () => {
    assert.equal(slugify('Топливо и ДВС'), 'топливо-и-двс');
});

test('slugify: strips html tags', () => {
    assert.equal(slugify('<b>Bold</b> Text'), 'bold-text');
});

test('slugify: numbered heading trailing dot removed', () => {
    assert.equal(slugify('1. Introduction'), '1-introduction');
});

test('slugify: slashes to separator', () => {
    assert.equal(slugify('a/b\\c'), 'a-b-c');
});

test('slugify: collapses repeated separators', () => {
    assert.equal(slugify('a   b___c'), 'a-b-c');
});

test('slugify: trims leading/trailing separators', () => {
    assert.equal(slugify('  hi  '), 'hi');
});

test('slugify: empty input', () => {
    assert.equal(slugify(''), '');
});

test('slugify: keeps dots (version numbers)', () => {
    assert.equal(slugify('v2.4.3'), 'v2.4.3');
});

test('slugify: upper case option', () => {
    const up = createSlugify({ case: 'upper' });
    assert.equal(up('привет'), 'привет'.toUpperCase());
});

// ---- cleanHeadingText -----------------------------------------------------

test('cleanHeadingText: strips numbered prefix', () => {
    assert.equal(cleanHeadingText('1.2.3. Details'), 'Details');
});

test('cleanHeadingText: preserves version-like in middle', () => {
    assert.equal(cleanHeadingText('Update to 2.4.3 released'), 'Update to 2.4.3 released');
});

// ---- anchors --------------------------------------------------------------

test('anchor: single heading', () => {
    assert.equal(buildHierarchicalAnchor(['Топливо']), 'топливо');
});

test('anchor: hierarchical join with hyphen', () => {
    assert.equal(buildHierarchicalAnchor(['Free', 'Топливо']), 'free-топливо');
});

test('anchor: leading empties stripped', () => {
    assert.equal(buildHierarchicalAnchor(['', '', 'Real']), 'real');
});

test('anchor: inner empties preserved (double hyphen)', () => {
    assert.equal(buildHierarchicalAnchor(['A', '', 'B']), 'a--b');
});

test('anchor: all empty → empty string', () => {
    assert.equal(buildHierarchicalAnchor(['', '']), '');
});

test('anchor: empty stack', () => {
    assert.equal(buildHierarchicalAnchor([]), '');
});
