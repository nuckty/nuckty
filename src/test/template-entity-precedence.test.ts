import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlockFor } from '../bem/api.js';
import { Templates } from '../bem/templates.js';
import { render } from '../bem/render.js';
import type { BemNode } from '../bem/types.js';

for (const elem of [undefined, 'item']) {
    for (const tag of ['section', false, ''] as const) {
        test(`explicit ${String(tag)} tag wins for ${elem ?? 'block'} without evaluating tag callbacks`, () => {
            const templates = new Templates();
            const block = createBlockFor(templates);
            const selector = elem ? block('article').elem(elem) : block('article');
            let tagCalls = 0;

            selector({ tag: 'p' });
            selector.when(() => true)({
                tag: () => { tagCalls++; return 'aside'; },
                attrs: (_node, next) => ({ ...next(), title: 'from template' }),
            });
            const source: BemNode = { block: 'article', ...(elem ? { elem } : {}), tag, content: 'A < B', attrs: { id: 'kept' } };
            const before = structuredClone(source);
            const resolved = render(source, { templates, output: 'bemjson' }) as BemNode;

            assert.equal(resolved.tag, tag);
            assert.deepEqual(resolved.attrs, { id: 'kept', title: 'from template' });
            assert.equal(tagCalls, 0);
            assert.deepEqual(source, before);
            const htmlTag = tag || 'div';
            const expected = tag === false ? 'A &lt; B' : `<${htmlTag} class=${elem ? 'article__item' : 'article'} id=kept title="from template">A &lt; B</${htmlTag}>`;

            assert.equal(render(source, { templates }), expected);
        });
    }
}

test('absent and undefined source tags use the normal declaration chain', () => {
    const templates = new Templates();
    const block = createBlockFor(templates);

    block('article')({ tag: 'section' });
    block('article').mod('wide')({ tag: (_node, next) => next() === 'section' ? 'aside' : 'div' });
    for (const source of [{ block: 'article', mods: { wide: true } }, { block: 'article', mods: { wide: true }, tag: undefined }]) {
        assert.equal(render(source, { templates }), '<aside class="article article_wide"></aside>');
    }
});

for (const name of ['article', '*']) {
    test(`${name}: block and element selectors have separate domains for every mode`, () => {
        const templates = new Templates();
        const block = createBlockFor(templates);
        let blockPredicates = 0;

        block(name).when(() => { blockPredicates++; return true; })({ tag: 'article', attrs: { title: 'block only' }, content: 'block only' });
        block(name).elem('*')({ tag: 'span' });
        block(name).elem('title')({ tag: 'h2' });
        const child = { block: 'article', elem: 'title', content: 'Title' };

        assert.equal(render(child, { templates }), '<h2 class=article__title>Title</h2>');
        assert.equal(blockPredicates, 0);
        assert.equal(render({ block: 'article', elem: 'other', content: 'Text' }, { templates }), '<span class=article__other>Text</span>');
        assert.equal(render({ block: 'article' }, { templates }), '<article class=article title="block only">block only</article>');
    });
}

test('block structural modes do not replace elements with inherited block context', () => {
    const templates = new Templates();
    const block = createBlockFor(templates);

    block('article')({ tag: 'article', content: () => [{ elem: 'title', content: 'Title' }, { elem: 'body', content: 'Text' }] });
    block('article').elem('title')({ tag: 'h2' });
    block('article').elem('body')({ tag: 'p' });
    assert.equal(render({ block: 'article' }, { templates }), '<article class=article><h2 class=article__title>Title</h2><p class=article__body>Text</article>');
});
