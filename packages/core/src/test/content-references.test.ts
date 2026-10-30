import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMarkdown } from '../markdown/remark.js';
import { transformImagePathShared } from '../markdown/image-mapping.js';
import { postprocessHtml } from '../markdown/html-postprocess.js';
import { render } from '../bem/render.js';
import { runBuild } from './helpers/build.js';
import { parseIndentedSitemap, processSitemap } from '../stages/sitemap.js';
import { markdownCollection } from './helpers/markdown.js';

function html(source: string, options: Parameters<typeof createMarkdown>[0]): string {
    return render(createMarkdown(options).render(source).tree, { templates: markdownCollection() });
}

test('content references: source-relative links do not depend on the content directory', () => {
    for (const root of ['content', 'external/docs', 'guides with spaces/контент']) {
        const options = {
            sourceFile: 'docs/sub/page.md',
            inputPath: `./${root}/docs/sub/page.md`,
            currentUrl: '/docs/page',
            md2url: { 'docs/other.md': '/docs/other', 'docs/тест.md': '/docs/unicode' },
        };

        assert.match(html('[go](../other.md?q=1#section)', options), /href="\/docs\/other\?q=1#section"/);
        assert.ok(html('[go](../%D1%82%D0%B5%D1%81%D1%82.md)', options).includes('href=/docs/unicode'));
    }
});

test('content references: inputPath and standalone sourceFile are supported', () => {
    const mapping = { 'docs/other.md': '/other' };

    assert.ok(html('[go](../other.md)', { inputPath: './external/repo/docs/sub/page.md', md2url: mapping }).includes('href=/other'));
    assert.ok(html('[go](../other.md)', { sourceFile: 'docs/sub/page.md', md2url: mapping }).includes('href=/other'));
    assert.ok(html('[go](other.md)', {}).includes('href=other.md'));
});

test('content references: missing and ambiguous targets retain explicit diagnostics', () => {
    assert.throws(() => html('[go](../missing.md)', {
        sourceFile: 'docs/page.md', md2url: { 'other.md': '/other' },
    }), /Unknown relative link/);
    assert.throws(() => html('[go](other.md)', {
        sourceFile: 'unrelated/page.md', md2url: { 'a/other.md': '/a', 'b/other.md': '/b' },
    }), /Ambiguous Markdown link/);
    assert.throws(() => html('[go](other.md)', {
        sourceFile: 'docs/page.md', md2urls: { 'docs/other.md': ['/a/other', '/b/other'] }, currentUrl: '/elsewhere',
    }), /Ambiguous Markdown target/);
});

test('content references: Markdown and raw images use content-relative paths', () => {
    for (const root of ['content', 'external/docs', 'guides with spaces/контент']) {
        const options = {
            sourceFile: 'docs/page.md',
            inputPath: `./${root}/docs/page.md`,
            imageMapping: { 'images/logo.png': '_i1234567890123456' },
        };

        assert.equal(transformImagePathShared('../images/logo.png?q=1#x', options), '/_i1234567890123456?q=1#x');
        assert.ok(html('![Logo](../images/logo.png)', options).includes('src=/_i1234567890123456'));
        assert.equal(postprocessHtml('<img src="../images/logo.png">', options), '<img src="/_i1234567890123456">');
    }
});

test('content references: image exact keys win and legacy ambiguity remains an error', () => {
    const options = {
        sourceFile: 'docs/page.md',
        imageMapping: { 'images/logo.png': 'EXACT', 'docs/images/logo.png': 'RELATIVE', 'elsewhere/logo.png': 'OTHER' },
    };

    assert.equal(transformImagePathShared('images/logo.png', options), '/EXACT');
    assert.throws(() => transformImagePathShared('logo.png', options), /Ambiguous image/);
    assert.equal(transformImagePathShared('../missing.png', options), '../missing.png');
});

test('content references: build resolves links and both image syntaxes for every root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-content-references-'));

    try {
        await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
        await mkdir(path.join(root, 'config'));
        await writeFile(path.join(root, 'config/config-nuckty.ts'), "export default {targets:{main:{configDir:'config',outDir:'site'}},ext:['./document.mjs']};");
        await writeFile(path.join(root, 'config/site.json'), '{"bundles":[]}');
        await writeFile(path.join(root, 'document.mjs'), "export default env => env.document.register(data => ({tag:'html',content:[{tag:'head',content:{tag:'title',content:data.page.title}},{tag:'body',content:data.content}]}));");
        await writeFile(path.join(root, 'config/sitemap.yml'), 'sitemap:\n  - Page [/page, docs/page.md]\n  - Other [/other, other.md]\n');

        for (const contentRoot of ['content', 'external/docs', 'guides with spaces/контент']) {
            await mkdir(path.join(root, contentRoot, 'docs'), { recursive: true });
            await mkdir(path.join(root, contentRoot, 'images'), { recursive: true });
            await writeFile(path.join(root, contentRoot, 'docs/page.md'), '[Other](../other.md?q=1#section)\n\n![Logo](../images/logo.svg)\n\n<img src="../images/logo.svg">');
            await writeFile(path.join(root, contentRoot, 'other.md'), '# Other\n\n## Section');
            await writeFile(path.join(root, contentRoot, 'images/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect/></svg>');
            await writeFile(path.join(root, 'config/levels.json'), JSON.stringify([contentRoot]));
            await runBuild({ cwd: root, command: 'build' });

            const output = await readFile(path.join(root, 'site/html/page.html'), 'utf8');
            const mapping: Record<string, string> = JSON.parse(await readFile(path.join(root, '.build/image-mapping.json'), 'utf8'));
            const image = mapping['images/logo.svg'];

            assert.ok(image);
            assert.match(output, /href="\/other\?q=1#other-section"/);
            assert.ok(output.includes(`src=/${image}`), output);
            assert.ok(output.includes(`src="/${image}"`), output);
            assert.ok(!output.includes('../images/'), output);
        }
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('malformed sitemap entries fail instead of dropping leaves or their children', () => {
    for (const source of [
        'sitemap:\n  - "Home [/, index.md]"',
        'sitemap:\n  - Missing page declaration\n    - Child [/child, child.md]',
        'sitemap:\n  - Home [/, index.md]\n  - Invalid leaf',
    ]) {
        assert.throws(() => processSitemap(parseIndentedSitemap(source)), /Invalid sitemap line/);
    }
});

test('malformed sitemap entries reject invalid metadata instead of losing it', () => {
    for (const source of [
        'sitemap:\n  - Home [/, index.md, { layout: }]',
        'sitemap:\n  - Home [/, index.md, { layout: "landing"]',
    ]) {
        assert.throws(() => processSitemap(parseIndentedSitemap(source)), /Invalid sitemap metadata/);
    }
});
