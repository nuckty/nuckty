import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { render, Templates, runWithTemplates } from '@nuckty/core';
import { bundle } from './bundle.mjs';

const directories = await readdir(new URL('../blocks/', import.meta.url), { withFileTypes: true });
const declarations = [];

for (const entry of directories.filter((entry) => entry.isDirectory())) {
    const file = 'blocks/' + entry.name + '/' + entry.name + '.nu.ts';

    try {
        await readFile(new URL('../' + file, import.meta.url));
        declarations.push(file);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
const source =
    declarations.map((file, index) => 'import template' + index + ' from "./' + file + '";').join('\n') +
    '\nexport const templates = [' +
    declarations.map((_, index) => 'template' + index).join(',') +
    '];' +
    '\nexport { b } from "./blocks/bem/bem.ts";';
const compiled = await bundle(source);
const templates = new Templates();
runWithTemplates(templates, () => {
    for (const register of compiled.templates) {
        register();
    }
});

test('BEM composition contains entities, modifiers and mixes without HTML display modes', () => {
    const node = compiled.b(
        'code',
        undefined,
        'a < b',
        {},
        { mods: { wrap: 'soft' }, mix: { block: 'article', elem: 'code' } },
    );
    assert.deepEqual(node, {
        block: 'code',
        content: 'a < b',
        mods: { wrap: 'soft' },
        mix: { block: 'article', elem: 'code' },
    });
    assert.equal(render(node, { templates }), '<pre class="code code_wrap_soft article__code">a &lt; b</pre>');
});

test('templates independently map BEM entities to tags and escape link data', () => {
    const node = compiled.b('brand', undefined, 'nuckty', { linked: true, href: '/?q="<>&' });
    const resolved = render(node, { templates, output: 'bemjson' });
    assert.equal(resolved.tag, 'a');
    assert.equal(resolved.attrs.href, '/?q="<>&');
    assert.match(render(node, { templates }), /href="\/\?q=&quot;&lt;&gt;&amp;"/);
    assert.match(render(compiled.b('brand', undefined, 'nuckty', { linked: false }), { templates }), /^<span\b/);
});

test('nu.ts contains the structural and HTML modes without class-string rendering helpers', async () => {
    const main = await readFile(new URL('../blocks/showcase/showcase.nu.ts', import.meta.url), 'utf8');
    assert.match(main, /content: showcaseContent/);
    assert.match(main, /tag: 'h1'/);
    assert.doesNotMatch(main, /\bcls\s*:|\bel\(/);
    for (const directory of directories.filter((entry) => entry.isDirectory())) {
        const files = await readdir(new URL('../blocks/' + directory.name + '/', import.meta.url));
        assert.ok(!files.some((name) => name.endsWith('.bemjson.ts')));
    }
});

test('article declaration preserves Markdown phrasing and task checkbox tags and attributes', () => {
    const tree = {
        block: 'article',
        content: [
            {
                tag: 'p',
                bem: false,
                content: [
                    'Before ',
                    { tag: 'strong', bem: false, content: 'bold' },
                    ' and ',
                    { tag: 'em', bem: false, content: 'emphasis' },
                ],
            },
            { tag: 'input', bem: false, attrs: { type: 'checkbox', disabled: true, checked: true } },
        ],
    };
    assert.equal(render(tree, { templates }), render({ ...tree, tag: 'article' }, { templates: new Templates() }));
});

test('active navigation has aria-current and no href; other destinations remain distinct', () => {
    const entity = ['root', 'link'];

    for (const href of ['/', '/how', '/out']) {
        const active = render(compiled.b(...entity, 'Title', { active: true, href }), { templates, output: 'bemjson' });
        assert.equal(active.tag, 'span');
        assert.equal(active.attrs['aria-current'], 'page');
        assert.equal(active.attrs.href, undefined);
        const linked = render(compiled.b(...entity, 'Title', { active: false, href }), {
            templates,
            output: 'bemjson',
        });
        assert.equal(linked.tag, 'a');
        assert.equal(linked.attrs.href, href);
    }
});
