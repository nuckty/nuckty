import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attributes, b } from '../index.js';

test('b composes entities, content and props without empty fields', () => {
    assert.deepEqual(b('card'), { block: 'card', content: null });
    assert.deepEqual(
        b('card', 'title', 'Hi', { href: '/x' }, { mods: { size: 'l' }, elemMods: { active: true }, mix: { block: 'article', elem: 'title' } }),
        { block: 'card', elem: 'title', mods: { size: 'l' }, elemMods: { active: true }, mix: { block: 'article', elem: 'title' }, content: 'Hi', props: { href: '/x' } },
    );
});

test('attributes copies only named string and boolean props', () => {
    const node = b('link', undefined, null, { href: '/x', hidden: true, count: 3, title: undefined, extra: 'no' });

    assert.deepEqual(attributes(node, ['href', 'hidden', 'count', 'title']), { href: '/x', hidden: true });
    assert.deepEqual(attributes(b('link'), ['href']), {});
});
