/**
 * Tests for the video extension (openspec `ext-markdown-video`): the remark
 * plugin turns `@[provider](id)` into block-level `video` nodes, splitting the
 * surrounding paragraph; unknown providers and other link shapes stay ordinary
 * text and links; the node handler and the `video` template render the player.
 *
 * @module test/video-plugin
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root } from 'mdast';
import { NucktyEnv, Templates, createMarkdown, markdownTemplates, render, runWithTemplates } from '@nuckty/core';
import { remarkVideoEmbed, createVideoPlugin, DEFAULT_VIDEO_PROVIDERS, register, type VideoProvider } from '../index.js';
import videoTemplates from '../../blocks/video/video.nu.ts';

/** Parse and transform, returning the top-level nodes as plain data. */
function transform(src: string, plugin = remarkVideoEmbed): Array<Record<string, unknown>> {
    const tree = unified().use(plugin).runSync(unified().use(remarkParse).parse(src)) as Root;

    return JSON.parse(JSON.stringify(tree.children, (key, value: unknown) => key === 'position' ? undefined : value)) as Array<Record<string, unknown>>;
}

function videos(src: string, plugin = remarkVideoEmbed): Array<Record<string, unknown>> {
    return transform(src, plugin).filter((node) => node['type'] === 'video');
}

/** Render Markdown through a build-like environment with the extension loaded. */
function html(src: string, lang = 'en'): string {
    const env = new NucktyEnv();
    const templates = new Templates();

    register(env);
    runWithTemplates(templates, () => {
        markdownTemplates();
        videoTemplates();
    });
    const { tree } = createMarkdown({ lang, remarkPlugins: env.markdown.list(), nodeMappings: env.markdown.nodeMappings() }).render(src);

    return render(tree, { templates });
}

test('an embed alone replaces its paragraph with one video node', () => {
    assert.deepEqual(transform('@[youtube](bsgLJcQz43s)'), [{ type: 'video', provider: 'YouTube', src: 'https://www.youtube.com/embed/bsgLJcQz43s' }]);
});

test('prose around an embed stays in paragraphs before and after the video', () => {
    const nodes = transform('Watch this: @[youtube](abc) and that.');

    assert.deepEqual(nodes.map((node) => node['type']), ['paragraph', 'video', 'paragraph']);
    assert.deepEqual((nodes[0]!['children'] as Array<{ value: string }>).map((child) => child.value), ['Watch this: ']);
    assert.deepEqual((nodes[2]!['children'] as Array<{ value: string }>).map((child) => child.value), [' and that.']);
});

test('providers build their embed URLs and match names independent of case', () => {
    assert.equal(videos('@[rutube](abc123)')[0]!['src'], 'https://rutube.ru/play/embed/abc123');
    assert.equal(videos('@[vk](12345_67890)')[0]!['src'], 'https://vk.com/video_ext.php?oid=12345&id=67890');
    assert.equal(videos('@[YouTube](id)')[0]!['provider'], 'YouTube');
});

test('VK accepts a signed owner and preserves a full embed URL including its hash', () => {
    const provider = DEFAULT_VIDEO_PROVIDERS.find((candidate) => candidate.name === 'vk')!;
    const url = new URL(provider.src('-12345_67890'));

    assert.equal(url.searchParams.get('oid'), '-12345');
    assert.equal(url.searchParams.get('id'), '67890');
    const full = 'https://vkvideo.ru/video_ext.php?oid=-12345&id=67890&hash=fixture';

    assert.equal(provider.src(full), full);
    assert.equal(videos(`@[vk](${full})`)[0]!['src'], full);
    assert.throws(() => transform('@[vk](invalid)'), /VK video requires/);
});

test('unknown providers, plain links, image links and empty ids are not embeds', () => {
    for (const source of ['@[unknown](id)', 'see [youtube](https://youtube.com)', '@[![alt](img.png)](id)', '@[youtube]()']) {
        assert.deepEqual(videos(source), [], source);
        assert.equal(transform(source)[0]!['type'], 'paragraph', source);
    }
});

test('embeds inside blockquotes and list items are transformed', () => {
    for (const source of ['> @[youtube](abc)', '- @[youtube](abc)']) {
        assert.match(JSON.stringify(transform(source)), /"type":"video"/, source);
    }
});

test('custom providers are data matched independent of case', () => {
    const ids: string[] = [];
    const provider: VideoProvider = { name: 'PeerTube', label: 'PeerTube', src: (id) => {
        ids.push(id);

        return `https://peer.example/video/${id}`;
    } };
    const plugin = createVideoPlugin([provider]);

    for (const name of ['peertube', 'PEERTUBE']) {
        assert.equal(videos(`@[${name}](fixture)`, plugin)[0]!['src'], 'https://peer.example/video/fixture');
    }
    assert.deepEqual(ids, ['fixture', 'fixture']);
});

test('the video block renders the player with a localized title outside paragraphs', () => {
    assert.equal(
        html('Before @[youtube](abc) after'),
        '<p class=article__paragraph>Before <div class=video><iframe class=video__frame src=https://www.youtube.com/embed/abc title="YouTube video" loading=lazy allowfullscreen></iframe></div><p class=article__paragraph> after</p>',
    );
    assert.match(html('@[rutube](x)', 'ru'), /title="Видео RUTUBE"/);
});

test('the embed URL is one attribute value', () => {
    assert.match(html('@[youtube](<abc" data-probe="yes>)'), /src="https:\/\/www\.youtube\.com\/embed\/abc&quot; data-probe=&quot;yes"/);
});
