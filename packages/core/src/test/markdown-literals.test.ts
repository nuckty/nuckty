import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdown } from '../markdown/remark.js';
import { buildAnchorMap } from '../markdown/resolve-anchors.js';
import { postprocessHtml } from '../markdown/html-postprocess.js';
import { render } from '../bem/render.js';
import { markdownCollection } from './helpers/markdown.js';

function html(source: string, options: Parameters<typeof createMarkdown>[0] = {}): string {
    return render(createMarkdown(options).render(source).tree, { templates: markdownCollection() });
}

test('raw asset prefixes own only the start of a URL and preserve whole filenames', () => {
    const base = 'https://raw.example/files/';
    const options = { githubRawBase: [base] };
    const external = 'https://redirect.invalid/?to=https://raw.example/files/manual.pdf';
    const reference = html(`[external](${external})\n\n[owned](<${base}manual(one).pdf?q=1#part>)`, options);

    assert.ok(reference.includes(`href="${external}"`), reference);
    assert.ok(reference.includes('href="/manual(one).pdf?q=1#part"'), reference);
    assert.ok(html(`[prefix](${base})`, options).includes(`href=${base}`));
});

test('empty raw prefixes preserve links and both kinds of literal code', () => {
    const source = '[external](https://outside.invalid/page)\n\n`word raw`\n\n```text\nword raw\n```';
    const options = { baseUrl: 'https://site.invalid', githubRawBase: ['', ''] };

    assert.equal(html(source, options), html(source));
});

test('heading IDs come from plain suffixes while code and formatted literals remain content', () => {
    const renderer = createMarkdown();
    const source = '# First `{#sample}`\n\n# Second `{#sample}`\n\n# Formatted **text {#sample}**\n\n# Custom **text** {#explicit}';
    const result = renderer.render(source);
    const output = render(result.tree, { templates: markdownCollection() });

    assert.deepEqual(result.headings.map(heading => heading.anchor), ['first-sample', 'second-sample', 'formatted-text-sample', 'explicit']);
    assert.deepEqual(result.headings.map(heading => heading.text), ['First {#sample}', 'Second {#sample}', 'Formatted text {#sample}', 'Custom text']);
    assert.equal((output.match(/<code class=article__inline-code>\{#sample\}<\/code>/g) ?? []).length, 2);
    assert.ok(output.includes('<strong>text {#sample}</strong>'));
    assert.ok(output.includes('id=explicit'));
    assert.doesNotMatch(output, /\{#explicit\}/);
});

test('heading suffix handling leaves unrelated extension metadata usable', () => {
    const metadata = { extensionCallback: () => true };
    let original: import('mdast').Text | undefined;
    const plugin: import('unified').Plugin<[], import('mdast').Root> = () => tree => {
        const heading = tree.children[0];

        if (heading?.type === 'heading') {
            const child = heading.children[0];

            if (child?.type === 'text') {
                child.data = metadata;
                original = child;
            }
        }
    };
    const output = html('# Title {#custom}', { remarkPlugins: [plugin] });

    assert.ok(output.includes('id=custom'));
    assert.ok(output.includes('>Title</a>'));
    assert.equal(original?.value, 'Title {#custom}');
    assert.equal(original?.data, metadata);
    assert.equal(metadata.extensionCallback(), true);
});

test('raw image mapping handles every quote form without editing other attributes', () => {
    const env = { imageMapping: { 'logo.svg': '0123456789abcdef.svg' } };

    for (const source of ['<img src=logo.svg>', '<IMG SRC=logo.svg />', '<img src="logo.svg">', "<img src='logo.svg'>"]) {
        const output = postprocessHtml(source, env);

        assert.ok(output.includes('="/0123456789abcdef.svg"'), output);
    }
    assert.equal(
        postprocessHtml('<img title=\'example src="logo.svg"\' src=logo.svg?x=1&amp;y=2#part>', env),
        '<img title=\'example src="logo.svg"\' src="/0123456789abcdef.svg?x=1&amp;y=2#part">',
    );
    assert.equal(
        postprocessHtml('<img src=logo\u00a0mark.svg>', { imageMapping: { 'logo\u00a0mark.svg': 'unicode.svg' } }),
        '<img src="/unicode.svg">',
    );
});

test('image-shaped literals do not hide or corrupt a subsequent real image', () => {
    const env = { imageMapping: { 'logo.svg': '0123456789abcdef.svg' } };
    const literals = [
        '<!-- <img src="logo.svg"> -->',
        '<div data-example=\'<img src="logo.svg">\'>Example</div>',
        '<script>const image=\'<img src="logo.svg">\';</script>',
        '<style>.x{--image:\'<img src="logo.svg">\'}</style>',
        '<textarea><img src="logo.svg"></textarea>',
        '<title><img src="logo.svg"></title>',
        '<iframe><img src="logo.svg"></iframe>',
        '<pre><img src="logo.svg"></pre>',
        '<code><img src="logo.svg"></code>',
    ];

    for (const literal of literals) {
        const source = literal + '<img src="logo.svg">';

        assert.equal(postprocessHtml(source, env), literal + '<img src="/0123456789abcdef.svg">');
    }
    assert.equal(postprocessHtml('<img-helper src="logo.svg">', env), '<img-helper src="logo.svg">');
    assert.equal(postprocessHtml('<pre-example><img src="logo.svg"></pre-example>', env), '<pre-example><img src="/0123456789abcdef.svg"></pre-example>');
    const plaintext = '<plaintext><img src="logo.svg"></plaintext><img src="logo.svg">';

    assert.equal(postprocessHtml(plaintext, env), plaintext);
});

test('raw image entities use HTML attribute meaning and preserve unmapped bytes', () => {
    const env = { imageMapping: { 'logo.svg': 'image.svg', 'logo&copyx.svg': 'literal.svg', 'logo&copy=.svg': 'equals.svg' } };

    for (const value of ['logo&#46;svg', 'logo&#x2e;svg', 'logo&period;svg', 'logo&#46svg']) {
        assert.equal(postprocessHtml(`<img src="${value}">`, env), '<img src="/image.svg">');
    }
    assert.equal(postprocessHtml('<img src="logo.svg?a=1&#38;b=2#part">', env), '<img src="/image.svg?a=1&amp;b=2#part">');
    assert.equal(postprocessHtml('<img src="logo&copyx.svg">', env), '<img src="/literal.svg">');
    assert.equal(postprocessHtml('<img src="logo&copy=.svg">', env), '<img src="/equals.svg">');
    const source = '<!-- <img src="logo&#46;svg"> --><code><img src="logo&period;svg"></code><img src="missing&#46;svg">';

    assert.equal(postprocessHtml(source, env), source);
    assert.equal(postprocessHtml('<img src="logo&amp;period;svg">', env), '<img src="logo&amp;period;svg">');
});

test('literal angle-bracket heading content keeps metadata and distinct anchors', () => {
    const result = createMarkdown().render('# `<One>` props\n\n# `<Two>` props');

    assert.deepEqual(result.headings.map(({ text, anchor }) => ({ text, anchor })), [
        { text: '<One> props', anchor: 'one-props' },
        { text: '<Two> props', anchor: 'two-props' },
    ]);
    const output = render(result.tree, { templates: markdownCollection() });

    assert.ok(output.includes('&lt;One&gt;'));
    assert.ok(output.includes('&lt;Two&gt;'));
    const controls = createMarkdown().render('# <b>Visible</b>\n\n# 1. `<Three>` props\n\n# `<Four>` props {#explicit}');

    assert.deepEqual(controls.headings.map(({ text, anchor }) => ({ text, anchor })), [
        { text: 'Visible', anchor: 'visible' },
        { text: '<Three> props', anchor: 'three-props' },
        { text: '<Four> props', anchor: 'explicit' },
    ]);
    const escaped = createMarkdown().render(String.raw`# \<Five\> props`);

    assert.equal(escaped.headings[0]?.text, '<Five> props');
    assert.equal(escaped.headings[0]?.anchor, 'five-props');
    const hierarchical = createMarkdown().render('# API\n\n## `<One>` props');

    assert.equal(buildAnchorMap(hierarchical.headings).get('one-props'), 'api-one-props');
    assert.throws(() => createMarkdown().render('# `<One>` props\n\n# `<One>` props'), /Duplicate heading ID/);
});

test('copied code rewrites complete owned URLs rather than nested query values', () => {
    const options = { githubRawBase: 'https://raw.example/files/', baseUrl: 'https://site.example' };
    const external = 'https://redirect.invalid/?to=https://raw.example/files/manual.zip';

    for (const source of [`\`curl ${external}\``, `\`\`\`sh\ncurl ${external}\n\`\`\``]) {
        assert.ok(html(source, options).includes(external));
    }
    const direct = html('`curl https://raw.example/files/manual.zip`', options);

    assert.ok(direct.includes('curl https://site.example/manual.zip'));
});

test('URL token punctuation does not expose nested query values to raw rewriting', () => {
    const options = { githubRawBase: 'https://raw.example/files/', baseUrl: 'https://site.example' };

    for (const punctuation of [')', "'"]) {
        const external = `https://redirect.invalid/?value=x${punctuation}&next=https://raw.example/files/manual.zip`;
        const expected = external.replace(/&/g, '&amp;');

        for (const source of [`\`curl ${external}\``, `\`\`\`sh\ncurl ${external}\n\`\`\``]) {
            const output = html(source, options);

            assert.ok(output.includes(expected), 'the complete external token retains its nested URL');
            assert.ok(!output.includes('https://site.example/'));
        }
    }
    assert.ok(html("`curl 'https://raw.example/files/a(b).zip'`", options).includes("curl 'https://site.example/a(b).zip'"));
});

test('inline and fenced code match raw prefixes before HTML escaping', () => {
    const options = { githubRawBase: 'https://raw.example/feature&fix/', baseUrl: 'https://site.example' };
    const url = 'https://raw.example/feature&fix/manual.zip';

    for (const source of [`\`${url}\``, `\`\`\`text\n${url}\n\`\`\``]) {
        assert.ok(html(source, options).includes('https://site.example/manual.zip'));
    }
});
