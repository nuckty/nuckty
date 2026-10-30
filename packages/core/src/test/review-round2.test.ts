import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { transform } from 'lightningcss';
import { Templates } from '../bem/templates.js';
import { createBlockFor } from '../bem/api.js';
import { render } from '../bem/render.js';
import { serialize } from './helpers/serialize.js';
import { resolveTarget, allTargets, defineNucktyConfig } from '../targets/config.js';
import { inlineHashedSVGs, processImageReferences } from '../stages/css.js';

for (const name of ['constructor', 'toString', '__proto__']) {
    test(`modifier selector ignores inherited ${name} but accepts its own value`, () => {
        const templates = new Templates();
        createBlockFor(templates)('button').mod(name)({ tag: 'strong' });
        assert.equal(render({ block: 'button', content: 'x' }, { templates }), '<div class=button>x</div>');
        assert.match(render({ block: 'button', mods: { [name]: true }, content: 'x' }, { templates }), /^<strong /);

        const elements = new Templates();
        createBlockFor(elements)('menu').elem('item').mod(name)({ tag: 'strong' });
        assert.match(render({ block: 'menu', elem: 'item', content: 'x' }, { templates: elements }), /^<div /);
        assert.match(render({ block: 'menu', elem: 'item', elemMods: { [name]: true }, content: 'x' }, { templates: elements }), /^<strong /);
    });
}

test('wildcard element modifier selects modified elements and leaves block or unmodified elements unchanged', () => {
    const templates = new Templates();
    createBlockFor(templates)('menu').elem('*').mod('active', true)({ tag: 'strong' });
    assert.match(render({ block: 'menu', elem: 'item', elemMods: { active: true } }, { templates }), /^<strong /);
    assert.match(render({ block: 'menu', elem: 'label', elemMods: { active: true } }, { templates }), /^<strong /);
    assert.match(render({ block: 'menu', elem: 'item' }, { templates }), /^<div /);
    assert.match(render({ block: 'menu', mods: { active: true } }, { templates }), /^<div /);
});

test('resolved target identity belongs to its configuration key, including reused target objects', () => {
    const value = { name: 'old', configDir: 'config', outDir: 'site' };
    const config = defineNucktyConfig({ targets: { current: value } });
    assert.equal(resolveTarget(config, 'current').name, 'current');
    assert.equal(resolveTarget(config, undefined).name, 'current');
    assert.deepEqual(allTargets(config).map((target) => target.name), ['current']);
    assert.equal(value.name, 'old');
});

test('both HTML serializers retain enumerated hidden values and preserve boolean usage', () => {
    for (const output of [serialize, (node: Parameters<typeof serialize>[0]) => render(node, { templates: new Templates() })]) {
        assert.match(output({ tag: 'div', attrs: { hidden: 'until-found' } }), /hidden=["']?until-found/);
        assert.equal(output({ tag: 'div', attrs: { hidden: true } }), '<div hidden></div>');
        assert.equal(output({ tag: 'div', attrs: { hidden: false } }), '<div></div>');
    }
});

test('CSS image rewrite preserves fragment and query suffixes without rewriting external URLs', async () => {
    const mapping = { 'icons/filter.svg': '1234567890abcdef.svg', 'photo.png': '_i0123456789abcdef' };
    assert.equal(await processImageReferences('a{filter:url(icons/filter.svg#blur)}', mapping), 'a{filter:url(/1234567890abcdef.svg#blur)}');
    assert.equal(await processImageReferences('a{background:url(photo.png?v=2#view)}', mapping), 'a{background:url(/_i0123456789abcdef?v=2#view)}');
    const external = 'a{filter:url(https://example.com/icons/filter.svg#blur)}';
    assert.equal(await processImageReferences(external, mapping), external);
});

test('inlined SVG produces parseable CSS and a lossless payload; suffixes and external origins are retained', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'nuckty-review-svg-'));
    const filename = '1234567890abcdef.svg';
    const svg = "<svg xmlns='http://www.w3.org/2000/svg'><text>Alice's icon</text></svg>";

    try {
        await mkdir(path.join(directory, 'svg'));
        await writeFile(path.join(directory, 'svg', filename), svg);
        const css = await inlineHashedSVGs(`a{background:url(/${filename})}`, directory);
        const parsed = transform({ filename: 'fixture.css', code: Buffer.from(css), errorRecovery: false });
        assert.match(Buffer.from(parsed.code).toString(), /background:/);
        const encoded = css.match(/data:image\/svg\+xml,([^']*)'/)?.[1];
        assert.ok(encoded);
        assert.equal(decodeURIComponent(encoded), svg);
        for (const url of [`/${filename}#blur`, `/${filename}?v=2`, `https://example.com/${filename}`, `//example.com/${filename}`]) {
            const input = `a{filter:url(${url})}`;
            assert.equal(await inlineHashedSVGs(input, directory), input);
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('page URLs cannot occupy the hosting namespace while ordinary dotted routes remain valid', async () => {
    const { urlToFlat } = await import('../stages/html.js');
    for (const url of ['/features.js', '/guide.HTML', '/image.png', '/sitemap.xml', '/robots.txt', '/__nuckty_404', '/_i123abc', '/_c123abc', '/brotli', '/gzip/private', '/css', '/html', '/xml']) {
        assert.throws(() => urlToFlat(url), /reserved.*hosting/i, url);
    }
    assert.equal(urlToFlat('/release/1.0.0'), 'release_1.0.0.html');
    assert.equal(urlToFlat('/css/guide'), 'css_guide.html');
});

test('Markdown keeps authored spacing around inline HTML and adjacent links', async () => {
    const { createMarkdown } = await import('../markdown/index.js');
    const output = (source: string): string => render(createMarkdown().render(source).tree, { templates: new Templates() });
    assert.equal(output('Hello <em>world</em>!'), '<p class=article__paragraph>Hello <em>world</em>!</p>');
    assert.equal(output('<span>Hello </span>world'), '<p class=article__paragraph><span>Hello </span>world</p>');
    assert.equal(output('x[link](/target)'), '<p class=article__paragraph>x<a class=article__link href=/target>link</a></p>');
    assert.equal(output('x [link](/target)'), '<p class=article__paragraph>x <a class=article__link href=/target>link</a></p>');
});
