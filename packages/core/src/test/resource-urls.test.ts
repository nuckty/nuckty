import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runBuild } from './helpers/build.js';
import { processImageReferences, inlineHashedSVGs } from '../stages/css.js';
import { assetsStage } from '../stages/assets.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';

async function write(root: string, file: string, value: string): Promise<void> {
    const destination = path.join(root, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value);
}

test('nested build keeps all resources in cwd rather than a parent package', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'nuckty-resource-boundary-'));
    const child = path.join(parent, 'consumer');
    const svg = (owner: string): string => `<svg xmlns="http://www.w3.org/2000/svg"><title>${owner}</title></svg>`;

    try {
        await write(parent, 'package.json', '{"name":"parent","type":"module"}');
        await write(child, 'config/config-nuckty.ts', "export default {targets:{main:{configDir:'config',outDir:'site'}},ext:['./document.mjs']};");
        await write(child, 'document.mjs', "export default env=>env.document.register(data=>({tag:'html',content:[{tag:'head',content:{tag:'title',content:'Fixture'}},{tag:'body',content:data.content}]}));");
        await write(child, 'config/site.json', '{"bundles":["fixture"],"githubRawBase":null}');
        await write(child, 'config/levels.json', '["content","blocks"]');
        await write(child, 'config/external.json', '["git@github.com:example/asset-repo.git"]');
        await write(child, 'config/sitemap.yml', 'sitemap:\n  - Home [/, index.md]\n');
        await write(child, 'content/index.md', '# Child\n\n![Own](images/own.svg)\n');
        await write(child, 'blocks/package.json', '{"type":"commonjs"}');
        await write(child, 'blocks/fixture/fixture.bemdecl.js', 'module.exports=["fixture"];');

        for (const [root, owner] of [[parent, 'parent-shadow'], [child, 'child-active']] as const) {
            await write(root, 'content/images/own.svg', svg(owner));
            await write(root, 'blocks/fixture/fixture.css', `.fixture{--review-owner:${owner}}`);
            await write(root, 'blocks/fixture/fixture.js', `globalThis.reviewOwner=${JSON.stringify(owner)};`);
            await write(root, 'external/asset-repo/manual.pdf', owner);
        }

        await runBuild({ command: 'build', cwd: child });

        const cssFile = (await readdir(path.join(child, 'site/css')))[0]!;
        const jsFile = (await readdir(path.join(child, 'site/js')))[0]!;
        const mapping: Record<string, string> = JSON.parse(await readFile(path.join(child, '.build/image-mapping.json'), 'utf8'));
        const css = await readFile(path.join(child, 'site/css', cssFile), 'utf8');
        const js = await readFile(path.join(child, 'site/js', jsFile), 'utf8');
        const pdf = await readFile(path.join(child, 'site/manual.pdf'), 'utf8');
        const image = await readFile(path.join(child, 'site/svg', mapping['images/own.svg']!), 'utf8');

        assert.deepEqual({
            css: css.includes('child-active') && !css.includes('parent-shadow'),
            js: js.includes('child-active') && !js.includes('parent-shadow'),
            pdf: pdf === 'child-active',
            svg: image === svg('child-active'),
        }, { css: true, js: true, pdf: true, svg: true });
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
});

test('CSS URL rewriting resolves decoded valid filenames without changing literal text', async () => {
    const mapping = {
        'images/own(a).png': '_i0123456789abcdef',
        'images/own.PNG': '_ifedcba9876543210',
    };
    const css = '.x{content:"url(images/own.PNG)";background:url("images/own(a).png?v=2#piece")}\n.y{background:url(images/own.PNG)}';
    const actual = await processImageReferences(css, mapping);

    assert.equal(actual, '.x{content:"url(images/own.PNG)";background:url(/_i0123456789abcdef?v=2#piece)}\n.y{background:url(/_ifedcba9876543210)}');
});

test('CSS escaped URLs and source locations survive Unicode text and custom properties', async () => {
    const css = '.x{content:"Я😀 url(own.PNG)";--image:url(own\\(a\\).PNG);background:var(--image)}';
    const actual = await processImageReferences(css, { 'own(a).PNG': '_i0123456789abcdef' });

    assert.equal(actual, '.x{content:"Я😀 url(own.PNG)";--image:url(/_i0123456789abcdef);background:var(--image)}');
});

test('URL-like text and comments remain literal while actual URLs are rewritten', async () => {
    const css = '.x{content:"url(plain.png)";background:url(plain.png)}/* url(plain.png) */';
    const actual = await processImageReferences(css, { 'plain.png': '_i0123456789abcdef' });

    assert.equal(actual, '.x{content:"url(plain.png)";background:url(/_i0123456789abcdef)}/* url(plain.png) */');
});

test('image-set string and url alternatives both resolve to artifact resources', async () => {
    const css = '.x{background:image-set("own(a).png" 1x,url(own.PNG) 2x)}';
    const actual = await processImageReferences(css, { 'own(a).png': '_i0123456789abcdef', 'own.PNG': '_ifedcba9876543210' });

    assert.equal(actual, '.x{background:image-set(url(/_i0123456789abcdef) 1x,url(/_ifedcba9876543210) 2x)}');
});

test('SVG inlining preserves quoted URL-like content', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-inline-svg-token-'));
    const hash = '0123456789abcdef';

    try {
        await write(root, `svg/${hash}.svg`, '<svg/>');
        const css = `.x{content:"url(/${hash}.svg)";background:url(/${hash}.svg)}`;
        const actual = await inlineHashedSVGs(css, root);

        assert(actual.includes(`content:"url(/${hash}.svg)"`));
        assert(actual.includes("background:url('data:image/svg+xml,%3Csvg%2F%3E')"));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('missing target external list discovers only repositories under the explicit cwd', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'nuckty-external-root-'));
    const child = path.join(parent, 'consumer');

    try {
        await write(parent, 'package.json', '{"name":"parent"}');
        await write(parent, 'config/external.json', '["git@github.com:example/parent-repo.git"]');
        await write(parent, 'external/parent-repo/parent.pdf', 'parent-only');
        await write(child, 'config/site.json', '{}');
        await write(child, 'external/child-repo/child.pdf', 'child-only');
        await assetsStage({
            cwd: child, configDir: path.join(child, 'config'), buildDir: path.join(child, '.build'),
            outDir: path.join(child, 'site'), target: 'main', env: new NucktyEnv(),
            templates: new Templates(), store: {}, cache: new Map(),
        });

        assert.equal(await readFile(path.join(child, 'site/child.pdf'), 'utf8'), 'child-only');
        assert(!((await readdir(path.join(child, 'site'))).includes('parent.pdf')));
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
});

test('resource URL input whitespace normalizes before percent-decoded filename lookup', async () => {
    const mapping = { 'logo.svg': '0123456789abcdef.svg', ' logo .svg': 'fedcba9876543210.svg' };
    const { postprocessHtml } = await import('../markdown/html-postprocess.js');
    const html = postprocessHtml('<img src=" \tlo&#9;go.svg\r\n">', { imageMapping: mapping });

    assert.equal(html, '<img src="/0123456789abcdef.svg">');
    assert.equal(postprocessHtml('<img src="%20logo%20.svg">', { imageMapping: mapping }), '<img src="/fedcba9876543210.svg">');
    assert.equal(await processImageReferences('a{background:url(" logo.svg ")}', mapping), 'a{background:url(/0123456789abcdef.svg)}');
    assert.equal(await processImageReferences('a{background:url("%20logo%20.svg")}', mapping), 'a{background:url(/fedcba9876543210.svg)}');
    const missing = '<img src=" missing.svg ">';

    assert.equal(postprocessHtml(missing, { imageMapping: mapping }), missing);
});

