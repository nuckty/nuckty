import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../bem/naming.js';

test('classify: bare block', () => {
    assert.equal(classify({ block: 'page' }), 'page');
});

test('classify: block + elem', () => {
    assert.equal(classify({ block: 'page', elem: 'content' }), 'page__content');
});

test('classify: block mods (string value)', () => {
    assert.equal(
        classify({ block: 'page', mods: { theme: 'dark' } }),
        'page page_theme_dark',
    );
});

test('classify: block mods (boolean)', () => {
    assert.equal(
        classify({ block: 'page', mods: { hidden: true } }),
        'page page_hidden',
    );
});

test('classify: falsey mods dropped', () => {
    assert.equal(
        classify({ block: 'page', mods: { a: false, b: null, c: undefined, d: 'x' } }),
        'page page_d_x',
    );
});

test('classify: elemMods used when elem is set', () => {
    assert.equal(
        classify({ block: 'page', elem: 'heading', elemMods: { level: '1' } }),
        'page__heading page__heading_level_1',
    );
});

test('classify: mix with string', () => {
    assert.equal(
        classify({ block: 'page', mix: 'extra' }),
        'page extra',
    );
});

test('classify: mix with entity', () => {
    assert.equal(
        classify({ block: 'page', mix: { block: 'link' } }),
        'page link',
    );
});

test('classify: mix with entity carrying mods', () => {
    assert.equal(
        classify({ block: 'page', mix: { block: 'link', mods: { active: true } } }),
        'page link link_active',
    );
});

test('classify: mix array', () => {
    assert.equal(
        classify({ block: 'page', mix: [{ block: 'a' }, 'b', { block: 'c', elem: 'd' }] }),
        'page a b c__d',
    );
});

test('classify: cls appended last', () => {
    assert.equal(
        classify({ block: 'page', cls: 'extra-class' }),
        'page extra-class',
    );
});

test('classify: only cls (no block)', () => {
    assert.equal(classify({ cls: 'standalone' }), 'standalone');
});

test('classify: bem:false drops BEM classes, keeps cls', () => {
    assert.equal(classify({ block: 'page', bem: false, cls: 'x' }), 'x');
});

test('classify: null when nothing', () => {
    assert.equal(classify({}), null);
});

test('classify: an empty modifier value keeps the value delimiter', () => {
    assert.equal(classify({ block: 'b', mods: { m: '' } }), 'b b_m_');
    assert.equal(classify({ block: 'b', elem: 'e', elemMods: { m: '' } }), 'b__e b__e_m_');
});
