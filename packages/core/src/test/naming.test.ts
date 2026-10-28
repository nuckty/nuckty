/**
 * Tests for BEM naming — classify/stringify/parse.
 *
 * @module test/naming
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, stringifyEntity, parseClass } from '../bem/naming.js';
import { classicPreset } from '../bem/types.js';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';

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

test('stringifyEntity: block only', () => {
    assert.equal(stringifyEntity({ block: 'b' }), 'b');
});

test('stringifyEntity: block + elem', () => {
    assert.equal(stringifyEntity({ block: 'b', elem: 'e' }), 'b__e');
});

test('parseClass: round-trip block', () => {
    assert.deepEqual(parseClass('page', classicPreset), { block: 'page' });
});

test('parseClass: block + elem', () => {
    assert.deepEqual(parseClass('page__content', classicPreset), { block: 'page', elem: 'content' });
});

test('parseClass: block + mod + val', () => {
    assert.deepEqual(parseClass('page_theme_dark', classicPreset), {
        block: 'page',
        modName: 'theme',
        modVal: 'dark',
    });
});
test('empty string modifiers retain the value delimiter in entity and class naming', () => {
    for (const preset of [classicPreset, { elem: '--', mod: '-', modVal: '=' }]) {
        for (const elem of [undefined, 'e']) {
            const entity = elem === undefined ? { block: 'b', mods: { m: '' } } : { block: 'b', elem, elemMods: { m: '' } };
            const expected = `b${elem ? preset.elem + elem : ''}${preset.mod}m${preset.modVal}`;

            assert.equal(stringifyEntity(entity, preset), expected);
            assert.equal(classify(entity, preset)?.split(' ').at(-1), expected);
            assert.equal(classify({ block: 'outer', mix: entity }, preset)?.split(' ').at(-1), expected);
        }
        assert.equal(stringifyEntity({ block: 'b', mods: { m: true } }, preset), `b${preset.mod}m`);
    }
});

test('engine naming stays classic when a caller tries to change its exported defaults', () => {
    const original = classicPreset.elem;
    const node = { block: 'menu', elem: 'item' };
    const options = { templates: new Templates() };
    const before = render(node, options);

    try {
        const changed = Reflect.set(classicPreset, 'elem', '--');
        const after = render(node, options);

        assert.equal(after, before, 'shared engine naming must not change between renders');
        assert.equal(changed, false);
        assert.equal(after, '<div class=menu__item></div>');
        assert.equal(classify(node, { elem: '--', mod: '-', modVal: '-' }), 'menu--item');
    } finally {
        if (classicPreset.elem !== original) {
            Reflect.set(classicPreset, 'elem', original);
        }
    }
});

