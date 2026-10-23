import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdown } from '../markdown/index.js';
import { postprocessHtml } from '../markdown/html-postprocess.js';
import { transformImagePathShared } from '../markdown/image-mapping.js';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';

function html(source: string, options: Parameters<typeof createMarkdown>[0] = {}): string {
    return render(createMarkdown(options).render(source).tree, { templates: new Templates() });
}

test('Markdown preserves references, delete, task state, start, alignment and footnote text', () => {
    const result = html('[KEEP][ref] ![ALT][img] ~~DELETE~~ body[^one]\n\n[ref]: /target "TITLE"\n[img]: /image.png\n\n5. Five\n\n- [x] done\n\n| Heading |\n| :---: |\n| Cell |\n\n[^one]: Footnote body');
    for (const fragment of ['href=/target', 'title=TITLE', '>KEEP</a>', 'alt=ALT', '<del>DELETE</del>', 'start=5', 'type=checkbox disabled checked', 'text-align:center', 'href=#fn-one', 'Footnote body']) {
        assert.ok(result.includes(fragment), fragment + ': ' + result);
    }
});

test('custom heading ID is serialized and suffix removed from formatted visible content', () => {
    const result = html('# **Title** {#x data-probe=yes}');
    assert.ok(result.includes('id="x data-probe=yes"'));
    assert.ok(result.includes('href="#x data-probe=yes"'));
    assert.ok(result.includes('<strong>Title</strong>'));
    assert.ok(!result.includes('{#'));
});

test('directive fallback and registered text directives preserve labels', () => {
    assert.ok(html('::unknown[KEEP]').includes('KEEP'));
    assert.ok(html(':known[KEEP]', { directiveMappings: new Map([['known', () => ({ tag: 'mark', bem: false, content: 'Handled' })]]) }).includes('<mark>Handled</mark>'));
});

test('literal code fences and attributed raw HTML remain byte-preserved', () => {
    assert.ok(html('```text\n::: grid\n  code\n```').includes('::: grid\n  code'));
    const raw = '<PRE class="sample">A  B\n  C <img src="x.png"></PRE><code title="A  B">A — B</code><span data-value="A  B">A — B</span>';
    assert.equal(postprocessHtml(raw, { imageMapping: { 'x.png': 'hashed' } }), raw);
    assert.equal(postprocessHtml('<a href="/">A</a> — B'), '<a href="/">A</a> — B');
});

test('Markdown links resolve normalized source-relative paths and preserve URI suffixes', () => {
    const options = { inputPath: './external/docs/a/sub/start.md', currentUrl: '/ru/start', md2url: { 'a/sub/page.md': '/near', 'a/page.md': '/up', 'a/тест.md': '/unicode' } };
    for (const [link, expected] of [['page.md', '/near'], ['./page.md', '/near'], ['../sub/../page.md', '/up'], ['../%D1%82%D0%B5%D1%81%D1%82.md?q=1#child', '/unicode?q=1#child']]) {
        assert.ok(html(`[link](${link})`, options).includes(expected!));
    }
    assert.throws(() => html('[bad](missing.md)', { md2url: { 'a/missing.md': '/a', 'b/missing.md': '/b' } }), /Ambiguous Markdown link/);
    assert.throws(() => html('[bad](p.md)', { md2urls: { 'p.md': ['/en/p', '/ru/p'] }, currentUrl: '/other' }), /Ambiguous Markdown target/);
    assert.throws(() => html('[bad](page.html?q=1)'), /Unknown relative link type/);
    assert.ok(html('[call](tel:file.md)').includes('href=tel:file.md'));
});

test('image mapping gives exact paths priority, preserves suffix and rejects ambiguous bare names', () => {
    const env = { inputPath: './external/docs/a/sub/start.md', imageMapping: { 'a/logo.png': 'A', 'b/logo.png': 'B', 'a/тест.png': 'U' } };
    assert.equal(transformImagePathShared('b/logo.png?q=1#x', env), '/B?q=1#x');
    assert.equal(transformImagePathShared('../%D1%82%D0%B5%D1%81%D1%82.png', env), '/U');
    assert.equal(transformImagePathShared('missing/logo.png', env), 'missing/logo.png');
    assert.throws(() => transformImagePathShared('logo.png', env), /Ambiguous image.*a\/logo.png, b\/logo.png/);
});

test('block embed HTML splits surrounding paragraph prose', () => {
    const plugin: import('unified').Plugin<[], import('mdast').Root> = () => tree => {
        const paragraph = tree.children[0];
        if (paragraph?.type === 'paragraph') {
            paragraph.children = [{ type: 'text', value: 'Before' }, { type: 'html', value: '<div class=video>Video</div>' }, { type: 'text', value: 'After' }];
        }
    };
    assert.equal(html('placeholder', { remarkPlugins: [plugin] }), '<p class=article__paragraph>Before</p><div class=video>Video</div><p class=article__paragraph>After</p>');
});


test('raw image mapping preserves logical ampersands in query values', () => {
    assert.equal(postprocessHtml('<img src="x.png?a=1&amp;b=2">', { imageMapping: { 'x.png': 'image' } }), '<img src="/image?a=1&amp;b=2">');
});
