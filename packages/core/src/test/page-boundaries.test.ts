import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { parseIndentedSitemap, processSitemap } from '../stages/sitemap.js';
import { htmlStage } from '../stages/html.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';
import { runWithTemplates } from '../bem/template-context.js';
import { block } from '../bem/api.js';
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

test('HTML passes the page content tree to the document and renders it with the document', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'nuckty-page-shape-'));
    const tree: BEMTree = [{ block: 'note', content: 'text' }];
    let prepared: BEMTree = null;

    try {
        const env = new NucktyEnv();
        env.document.register((data: DocumentData) => {
            prepared = data.content;

            return { tag: 'main', content: data.content };
        });
        const templates = new Templates();
        runWithTemplates(templates, () => block('note')({ tag: 'aside' }));
        const outDir = path.join(directory, 'site');
        await htmlStage({
            cwd: directory, configDir: directory, buildDir: path.join(directory, '.build'),
            outDir, target: 'main', env, templates, cache: new Map(),
            store: { sitemap: { sitemap: [], md2url: {}, md2urls: {}, url2md: {}, pages: { '/': { url: '/', file: 'index.md', name: 'Home', title: 'Home', section: null, breadcrumbs: [], tree } } } },
        });

        assert.equal(prepared, tree);
        assert.match(await readFile(path.join(outDir, 'html/index.html'), 'utf8'), /<main><aside class=note>text<\/aside><\/main>/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('sitemap titles may contain brackets and one URL cannot name two files', () => {
    const titled = processSitemap(parseIndentedSitemap('sitemap:\n  - Home [/, index.md]\n  - Release [beta] notes [/notes, notes.md]\n'));
    assert.equal(titled.pages['/notes']?.name, 'Release [beta] notes');

    assert.throws(
        () => processSitemap(parseIndentedSitemap('sitemap:\n  - Home [/, index.md]\n  - Guide [/guide, guide.md]\n  - Guide v2 [/guide, guide-v2.md]\n')),
        /URL "\/guide" is defined for both "guide.md" and "guide-v2.md"/,
    );
    const repeated = processSitemap(parseIndentedSitemap('sitemap:\n  - Home [/, index.md]\n  - Guide [/guide, guide.md]\n  - Guide again [/guide, guide.md]\n'));
    assert.equal(repeated.pages['/guide']?.file, 'guide.md');
});
