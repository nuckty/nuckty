import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { parseIndentedSitemap, processSitemap } from '../stages/sitemap.js';
import { stringifyEntity, classify } from '../bem/naming.js';
import { htmlStage } from '../stages/html.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';
import type { BEMTree } from '../bem/types.js';
import type { DocumentData } from '../document/document.js';

test('empty and unmarked sitemap declarations fail rather than omit pages', () => {
    for (const line of ['  -', '  Broken [broken, broken.md]']) {
        const source = `sitemap:\n  - Home [/, index.md]\n${line}\n`;

        assert.throws(() => parseIndentedSitemap(source), /Invalid sitemap.*line 3/);
    }
    const ordinary = 'sitemap:\n# Comment\n\n  - Home [/, index.md]\n';

    assert.deepEqual(Object.keys(processSitemap(parseIndentedSitemap(ordinary)).pages), ['/']);
});

test('single entity stringification uses the same modifier owner as class generation', () => {
    const element = { block: 'menu', elem: 'item', mods: { size: 'l' }, elemMods: { active: true } };

    assert.equal(stringifyEntity(element), 'menu__item_active');
    assert(classify(element)?.split(' ').includes(stringifyEntity(element)));
    assert.equal(stringifyEntity({ block: 'menu', mods: { size: 'l' } }), 'menu_size_l');
    assert.equal(stringifyEntity({ block: 'menu', elem: 'item', elemMods: { skipped: false, theme: 'dark' } }), 'menu__item_theme_dark');
});

test('HTML prepares single and array content equivalently and keeps empty trees empty', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'nuckty-page-shape-'));
    const raw = { raw: '<img src="icon.svg" alt="x">' };
    const prepared: BEMTree[] = [];
    const outputs: string[] = [];

    try {
        for (const [index, tree] of [raw, [raw], false, null, ''].entries()) {
            const env = new NucktyEnv();
            env.document.register((data: DocumentData) => {
                prepared.push(data.content);

                return { tag: 'main', content: data.content };
            });
            const outDir = path.join(directory, `site-${index}`);
            await htmlStage({
                cwd: directory, configDir: directory, buildDir: path.join(directory, '.build'),
                outDir, target: 'main', env, templates: new Templates(), cache: new Map(),
                store: { imageMapping: { 'docs/icon.svg': '0123456789abcdef.svg' },
                    sitemap: { pages: { '/': { url: '/', file: 'docs/index.md', tree } } } },
            });
            outputs.push(await readFile(path.join(outDir, 'html/index.html'), 'utf8'));
        }

        assert.deepEqual(prepared[0], prepared[1]);
        assert.equal(outputs[0], outputs[1]);
        assert(outputs[0]?.includes('src="/0123456789abcdef.svg"'));
        assert.deepEqual(prepared.slice(2), [[], [], []]);
        assert.deepEqual(raw, { raw: '<img src="icon.svg" alt="x">' });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

