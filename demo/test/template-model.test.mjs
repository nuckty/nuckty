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
    '\nexport { b } from "@nuckty/core";';
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

test('links escape their data and become a span with aria-current when current', () => {
    const link = (href, current) => ({ block: 'link', mods: { current }, props: { href }, content: 'Title' });

    assert.equal(render(link('/?q="<>&', false), { templates }), '<a href="/?q=&quot;&lt;&gt;&amp;">Title</a>');
    for (const href of ['/', '/markdown', '/output']) {
        assert.equal(render(link(href, true), { templates }), '<span aria-current=page>Title</span>');
        assert.equal(render(link(href, false), { templates }), `<a href=${href}>Title</a>`);
    }
});

test('the brand links home only through its modifier', () => {
    const data = { page: { url: '/media' }, assets: { images: {} }, lang: 'en' };

    assert.equal(render({ block: 'brand', props: data }, { templates }), '<span class=brand><span class=brand__name>nuckty demo</span></span>');
    assert.match(render({ block: 'brand', mods: { linked: true }, props: data }, { templates }), /^<a class="brand brand_linked" href=\/ aria-label="nuckty demo home">/);
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

test('template declarations rely on engine entity matching and tag precedence', async () => {
    for (const file of declarations) {
        const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
        assert.doesNotMatch(source, /!node\.(?:elem|tag)/, file);
    }
});
