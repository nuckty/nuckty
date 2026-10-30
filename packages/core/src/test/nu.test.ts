/**
 * Tests for the nu template engine: `block()` API, predicate specificity,
 * mode composition via `next()`, named-intent modes (replace/wrap/def).
 *
 * These exercise the full stack (api → templates → matcher → render → serialize)
 * and lock in the approved authoring syntax.
 *
 * @module test/nu
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { block } from '../bem/api.js';
import { runWithTemplates } from '../bem/template-context.js';
import { Templates } from '../bem/templates.js';
import { render } from '../bem/render.js';
import type { BEMTree } from '../bem/types.js';

/** Helper: render a tree against a fresh templates populated by `fn`. */
function withTemplates(fn: () => void, tree: BEMTree): string {
    const reg = new Templates();
    runWithTemplates(reg, fn);
    return render(tree, { templates: reg });
}

test('block() sets tag', () => {
    const html = withTemplates(() => {
        block('menu')({ tag: 'ul' });
    }, { block: 'menu' });
    assert.equal(html, '<ul class=menu></ul>');
});

test('block().elem() refines the predicate', () => {
    const html = withTemplates(() => {
        block('menu')({ tag: 'ul' });
        block('menu').elem('item')({ tag: 'li' });
    }, { block: 'menu', content: [{ block: 'menu', elem: 'item' }] });
    assert.equal(html, '<ul class=menu><li class=menu__item></ul>');
});

test('mode function receives node', () => {
    const html = withTemplates(() => {
        block('link')({ tag: 'a', attrs: (n) => ({ href: String(n.props?.url ?? '') }) });
    }, { block: 'link', props: { url: '/x' } });
    assert.equal(html, '<a class=link href=/x></a>');
});

test('next() composes lower-specificity value', () => {
    const html = withTemplates(() => {
        block('btn')({ cls: 'base' });
        block('btn')({ cls: (_n, next) => `${next()} extra` });
    }, { block: 'btn' });
    assert.equal(html, '<div class="btn base extra"></div>');
});

test('mods compose via next()', () => {
    const html = withTemplates(() => {
        block('btn')({ mods: () => ({ size: 'm' }) });
        block('btn')({ mods: (_n, next) => ({ ...next(), theme: 'dark' }) });
    }, { block: 'btn' });
    assert.equal(html, '<div class="btn btn_size_m btn_theme_dark"></div>');
});

test('predicate .when() filters', () => {
    const html = withTemplates(() => {
        block('item')({ tag: 'li' });
        block('item').when((n) => Boolean(n.props?.active))({
            mods: () => ({ active: true }),
        });
    }, { block: 'item', props: { active: true } });
    assert.equal(html, '<li class="item item_active"></li>');
});

test('when() does not fire when predicate is false', () => {
    const html = withTemplates(() => {
        block('item')({ tag: 'li' });
        block('item').when((n) => Boolean(n.props?.active))({
            mods: () => ({ active: true }),
        });
    }, { block: 'item', props: { active: false } });
    assert.equal(html, '<li class=item></li>');
});

test('mod() predicate matches only the specified mod', () => {
    // `mods` mode REPLACES the node's mods (bem-xjst semantics). To keep the
    // existing size:l AND add big:true, merge via next().
    const html = withTemplates(() => {
        block('btn')({ tag: 'button' });
        block('btn').mod('size', 'l')({ mods: (_n, next) => ({ ...next() as object, big: true }) });
    }, { block: 'btn', mods: { size: 'l' } });
    assert.equal(html, '<button class="btn btn_size_l btn_big"></button>');
});

test('mod() predicate does not fire for other values', () => {
    const html = withTemplates(() => {
        block('btn')({ tag: 'button' });
        block('btn').mod('size', 'l')({ mods: () => ({ big: true }) });
    }, { block: 'btn', mods: { size: 'm' } });
    assert.equal(html, '<button class="btn btn_size_m"></button>');
});

test('replace() swaps the node', () => {
    const html = withTemplates(() => {
        block('badge').replace(() => ({ block: 'tag', mods: { color: 'red' } }));
    }, { block: 'badge' });
    assert.equal(html, '<div class="tag tag_color_red"></div>');
});

test('wrap() wraps the node', () => {
    const html = withTemplates(() => {
        block('card').wrap((n) => ({ block: 'card-wrapper', content: n }));
    }, { block: 'card', content: 'hi' });
    assert.equal(html, '<div class=card-wrapper><div class=card>hi</div></div>');
});

test('content mode overrides content', () => {
    const html = withTemplates(() => {
        block('box')({ content: () => [{ block: 'inner' }] });
    }, { block: 'box' });
    assert.equal(html, '<div class=box><div class=inner></div></div>');
});

test('templates apply recursively to children', () => {
    const html = withTemplates(() => {
        block('list')({ tag: 'ul' });
        block('list').elem('item')({ tag: 'li' });
    }, { block: 'list', content: [{ block: 'list', elem: 'item', content: 'a' }, { block: 'list', elem: 'item', content: 'b' }] });
    assert.equal(html, '<ul class=list><li class=list__item>a<li class=list__item>b</ul>');
});

test('block("*") is a low-specificity default', () => {
    const html = withTemplates(() => {
        block('*')({ tag: 'div' });
        block('special')({ tag: 'span' });
    }, { block: 'special' });
    assert.equal(html, '<span class=special></span>');
});

test('bare-arrow predicate shorthand works', () => {
    const html = withTemplates(() => {
        block('item')({ tag: 'li' });
        block('item')((n) => Boolean(n.props?.flag), { mods: () => ({ on: true }) });
    }, { block: 'item', props: { flag: 1 } });
    assert.equal(html, '<li class="item item_on"></li>');
});

test('.when() composed with the predicate shorthand does not recurse infinitely (RENDER-02)', () => {
    const calls: string[] = [];
    const html = withTemplates(() => {
        block('x').when(() => { calls.push('when'); return true; })(
            () => { calls.push('shorthand'); return true; },
            { tag: 'span' },
        );
    }, { block: 'x' });
    assert.equal(html, '<span class=x></span>');
    // Each predicate runs exactly once per node — the old code made the merged
    // closure call itself (RangeError: Maximum call stack size exceeded).
    assert.deepEqual(calls, ['when', 'shorthand']);
});

test('.when(false) composed with shorthand(true) short-circuits — template does not fire', () => {
    let shorthandCalled = false;
    const html = withTemplates(() => {
        block('x').when(() => false)(
            () => { shorthandCalled = true; return true; },
            { tag: 'span' },
        );
    }, { block: 'x' });
    assert.equal(html, '<div class=x></div>');
    assert.equal(shorthandCalled, false, 'second predicate must be short-circuited');
});

test('.when(true) composed with shorthand(false) does not fire the template', () => {
    const html = withTemplates(() => {
        block('x').when(() => true)(() => false, { tag: 'span' });
    }, { block: 'x' });
    assert.equal(html, '<div class=x></div>');
});

test('def() full takeover supports every BEMTree variant (RENDER-04)', () => {
    const cases: Array<[label: string, fn: () => BEMTree, want: string]> = [
        ['string', () => 'hello', 'hello'],
        ['array', () => [{ tag: 'span', content: 'hello' }], '<span>hello</span>'],
        ['false', () => false, ''],
        ['null', () => null, ''],
        ['node', () => ({ tag: 'section', content: 's' }), '<section>s</section>'],
    ];
    for (const [label, fn, want] of cases) {
        const html = withTemplates(() => {
            block('x').def(fn);
        }, { block: 'x' });
        assert.equal(html, want, `def returning ${label}`);
    }
});

test('wrap() original next() carries folded output modes of lower-priority templates (RENDER-03)', () => {
    const html = withTemplates(() => {
        block('x')({ tag: 'span' });
        block('x').wrap((_n, next) => ({ tag: 'section', content: next() }));
    }, { block: 'x' });
    // The wrapped original must keep the span tag from the LESS specific
    // template — the old blanket skip dropped it (`<div class=x>` inside).
    assert.equal(html, '<section><span class=x></span></section>');
});

test('replace() result is matched by the NEW block templates (RENDER-03)', () => {
    const html = withTemplates(() => {
        block('x').replace((_n, next) => ({ block: 'y', content: next() }));
        block('y')({ tag: 'span' });
    }, { block: 'x' });
    // The new block y gets ITS OWN templates (span); the original x rides
    // inside via next() — with its class, as the wrapped original.
    assert.equal(html, '<span class=y><div class=x></div></span>');
});

test('wrap() inside its own result subtree does not recurse ( RENDER-03 loop guard)', () => {
    const html = withTemplates(() => {
        block('x').wrap(() => {
            throw new Error('must not re-fire');
        });
        block('x').wrap((_n, next) => ({ tag: 'section', content: [next(), { block: 'x', tag: 'b' }] }));
        block('x')({ tag: 'div' });
    }, { block: 'x' });
    // The second (higher-order) wrap wins the chain; inside its produced
    // subtree x's control modes are suppressed, so the hand-written
    // {block:'x'} child is NOT re-wrapped — no infinite section nesting.
    assert.ok(html.includes('<section>'), html);
    assert.ok(!html.includes('<section><section'), 'must not nest sections infinitely: ' + html);
});

test('def results preserve sibling order for every tree shape', () => {
    const cases: Array<[BEMTree, string]> = [
        [[{ tag: 'b', content: 'B' }, [{ tag: 'u', content: 'U' }, false]], '<b>B</b><u>U</u>'],
        [null, ''], [false, ''], [undefined, ''], ['text', 'text'],
    ];

    for (const [replacement, expected] of cases) {
        const html = withTemplates(() => {
            block('x').def(() => replacement);
        }, { tag: 'main', content: [{ tag: 'i', content: 'before' }, { block: 'x' }, { tag: 'i', content: 'after' }] });
        assert.equal(html, `<main><i>before</i>${expected}<i>after</i></main>`);
    }
});

test('wrap next applies functional output modes exactly once per original', () => {
    let calls = 0;
    const html = withTemplates(() => {
        block('x')({ content: (_node, next) => { calls++; return `${next()}!`; } });
        block('x').wrap((_node, next) => ({ tag: 'section', content: next() }));
    }, { tag: 'main', content: [{ block: 'x', content: 'A' }, { block: 'x', content: 'B' }] });

    assert.equal(html, '<main><section><div class=x>A!</div></section><section><div class=x>B!</div></section></main>');
    assert.equal(calls, 2);
});

test('alternating control blocks terminate and each control runs once per branch', () => {
    const calls: string[] = [];
    const html = withTemplates(() => {
        block('x').wrap((_node, next) => { calls.push('x'); return { block: 'y', content: next() }; });
        block('y').wrap((_node, next) => { calls.push('y'); return { block: 'x', content: next() }; });
    }, { block: 'x', content: 'text' });

    assert.equal(html, '<div class=x><div class=y><div class=x>text</div></div></div>');
    assert.deepEqual(calls, ['x', 'y']);
});

test('output next reports an absent own value as undefined', () => {
    const html = withTemplates(() => {
        block('x')({ tag: (_node, next) => next() ?? 'span', attrs: (_node, next) => ({ ...next(), title: 'fallback' }) });
    }, { block: 'x' });

    assert.equal(html, '<span class=x title=fallback></span>');
});

test('mod() after elem() selects an element modifier and outranks the plain element', () => {
    const html = withTemplates(() => {
        block('menu').elem('item')({ tag: 'li' });
        block('menu').elem('item').mod('active')({ tag: 'b' });
        block('menu').mod('active')({ tag: 'nav' });
    }, [
        { block: 'menu', elem: 'item', elemMods: { active: true } },
        { block: 'menu', elem: 'item', mods: { active: true } },
        { block: 'menu', mods: { active: true } },
    ]);
    assert.equal(html, '<b class="menu__item menu__item_active"></b><li class=menu__item></li><nav class="menu menu_active"></nav>');
});

test('elem() after mod() is rejected because block modifiers do not reach elements', () => {
    withTemplates(() => {
        assert.throws(() => block('menu').mod('open').elem('item'), /select the element first/);
    }, null);
});
