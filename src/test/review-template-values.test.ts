import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlockFor } from '../bem/api.js';
import { Templates } from '../bem/templates.js';
import { render } from '../bem/render.js';
import type { BemNode } from '../bem/types.js';

for (const element of [false, true]) {
    test(`${element ? 'element' : 'block'} modifier refinement clears an old value without mutating the original`, () => {
        const templates = new Templates();
        const block = createBlockFor(templates);
        const base = element ? block('button').elem('icon') : block('button');
        const original = element ? base.elemMod('theme', 'dark') : base.mod('theme', 'dark');
        original({ tag: 'i' });
        const refined = element ? original.elemMod('busy') : original.mod('busy');
        refined({ tag: 'b' });
        const originalNode: BemNode = element
            ? { block: 'button', elem: 'icon', elemMods: { theme: 'dark' } }
            : { block: 'button', mods: { theme: 'dark' } };

        assert(render(originalNode, { templates }).startsWith('<i'));
        for (const value of [true, 'working'] as const) {
            const node: BemNode = element
                ? { block: 'button', elem: 'icon', elemMods: { busy: value } }
                : { block: 'button', mods: { busy: value } };

            assert(render(node, { templates }).startsWith('<b'));
        }
    });
}

test('undefined mode results clear source fields and leave other nodes unchanged', () => {
    const templates = new Templates();
    createBlockFor(templates)('private')({ content: () => undefined, mix: () => undefined, js: () => undefined });
    const source: BemNode = { block: 'private', content: 'remove-text', mix: 'remove-class', js: { owner: 'remove-data' } };
    const before = structuredClone(source);
    const resolved = render(source, { templates, output: 'bemjson' });

    assert.deepEqual(resolved, { block: 'private' });
    assert.equal(render({ tag: 'main', content: [source, { tag: 'i', content: 'after' }] }, { templates }), '<main><div class=private></div><i>after</i></main>');
    assert.deepEqual(source, before);
});

test('omitted modes retain source fields while explicit next preserves the fallback', () => {
    const templates = new Templates();
    const block = createBlockFor(templates);
    block('retained')({ tag: 'p' });
    block('next')({ content: (_node, next) => next() });

    assert.equal(render({ block: 'retained', content: 'kept' }, { templates }), '<p class=retained>kept</p>');
    assert.equal(render({ block: 'next', content: 'fallback' }, { templates }), '<div class=next>fallback</div>');
});

test('typed display callbacks clear fields and preserve absent next fallbacks', () => {
    const templates = new Templates();
    const block = createBlockFor(templates);

    block('cleared')({
        tag: () => undefined,
        attrs: () => undefined,
        mods: () => undefined,
        elemMods: () => undefined,
        cls: () => undefined,
        bem: () => undefined,
    });
    block('fallback')({ tag: (_node, next) => next(), attrs: (_node, next) => next() });
    const source: BemNode = { block: 'cleared', tag: 'section', attrs: { title: 'remove' }, mods: { private: true }, elemMods: { private: true }, cls: 'remove', bem: false };
    const before = structuredClone(source);

    assert.deepEqual(render(source, { templates, output: 'bemjson' }), { block: 'cleared' });
    assert.equal(render(source, { templates }), '<div class=cleared></div>');
    assert.deepEqual(source, before);
    assert.equal(render({ block: 'fallback' }, { templates }), '<div class=fallback></div>');
});

test('wildcard element selectors refine elements without matching block roots', () => {
    const templates = new Templates();
    const block = createBlockFor(templates);

    block('menu')({ tag: 'ul' });
    block('menu').elem('*')({ tag: 'li' });
    assert.equal(render({ block: 'menu', content: [{ elem: 'item', content: 'A' }, { elem: 'label', content: 'B' }] }, { templates }), '<ul class=menu><li class=menu__item>A</li><li class=menu__label>B</li></ul>');
    assert.equal(render({ block: 'other', elem: 'item' }, { templates }), '<div class=other__item></div>');
    const global = new Templates();

    createBlockFor(global)('*').elem('*')({ tag: 'b' });
    assert.equal(render({ block: 'other' }, { templates: global }), '<div class=other></div>');
    assert.equal(render({ block: 'other', elem: 'item' }, { templates: global }), '<b class=other__item></b>');
});

