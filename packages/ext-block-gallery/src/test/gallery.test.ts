/**
 * Tests for @nuckty/ext-block-gallery (openspec `ext-block-gallery`):
 * - `extractImages` collects `![]()` images from container paragraphs (a run
 *   of images collapses into one paragraph; blank lines split paragraphs);
 * - `galleryNode` rewrites image srcs through the shared image-mapping, marks
 *   every image except the first `loading=lazy`, groups items by `data-group`,
 *   and appends the `lightbox` container;
 * - `galleryHandler` returns `null` for a container without images (plain
 *   content fallback) and the gallery tree otherwise;
 * - `register` adds the `blocks/` level and maps the `gallery` directive;
 * - the blocks render: a template collection produces the gallery HTML.
 *
 * @module test/gallery
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NucktyEnv, Templates, render, runWithTemplates } from '@nuckty/core';
import { register as registerExtension, galleryHandler } from '../index.js';
import { extractImages, galleryNode } from '../gallery.js';
import type { MdastNode } from '../gallery.js';
import galleryTemplates from '../../blocks/gallery/gallery.nu.ts';
import lightboxTemplates from '../../blocks/lightbox/lightbox.nu.ts';

function image(url: string, alt = ''): MdastNode {
    return { type: 'image', url, alt };
}

function paragraph(...children: MdastNode[]): MdastNode {
    return { type: 'paragraph', children };
}

test('extractImages collects images from collapsed runs and separate paragraphs', () => {
    const children: MdastNode[] = [
        paragraph(image('a.png', 'A'), { type: 'text' }, image('b.png', 'B')),
        paragraph(image('c.png', 'C')),
        paragraph({ type: 'text' }),
    ];
    assert.deepEqual(extractImages(children), [
        { src: 'a.png', alt: 'A' },
        { src: 'b.png', alt: 'B' },
        { src: 'c.png', alt: 'C' },
    ]);
});

test('galleryNode rewrites srcs via image-mapping, lazies all but the first, appends lightbox', () => {
    const node = galleryNode(
        [{ src: 'free/light.png', alt: 'Light' }, { src: 'free/seats.png', alt: 'Seats' }, { src: 'free/door.png', alt: 'Door' }],
        { imageMapping: { 'free/light.png': '/_i62e5723492d14dc0', 'free/seats.png': '/_i9f8e7d6a1b2c3d4', 'free/door.png': '/_i0123456789abcdef' } },
        { groupId: 'g-gallery' },
    );
    assert.equal(node.block, 'gallery');
    const items = node.content as import('@nuckty/core').BemNode[];
    assert.equal(items.length, 4);  // three items + the lightbox container
    assert.equal(items[3]!.block, 'lightbox');

    const first = items[0]! as { attrs: Record<string, string>; content: { attrs: Record<string, string> } };
    assert.equal(first.attrs.href, '/_i62e5723492d14dc0');
    assert.equal(first.attrs['data-group'], 'g-gallery');
    assert.equal(first.content.attrs.src, '/_i62e5723492d14dc0');
    assert.equal(first.content.attrs.loading, undefined);  // first stays eager

    assert.equal((items[1]!.content as { attrs: Record<string, string> }).attrs.loading, 'lazy');
    assert.equal((items[2]!.content as { attrs: Record<string, string> }).attrs.loading, 'lazy');
});

test('galleryHandler maps a container with images and falls back on an empty one', () => {
    const withImages = galleryHandler(
        { name: 'gallery', children: [paragraph(image('a.png'))] },
        { imageMapping: { 'a.png': '_iaaa' } },
    );
    assert.ok(withImages);
    assert.equal((withImages as { block?: string }).block, 'gallery');

    const empty = galleryHandler({ name: 'gallery', children: [paragraph({ type: 'text' })] }, { imageMapping: {} });
    assert.equal(empty, null);
});

test('register adds the blocks level and maps the gallery directive', () => {
    const env = new NucktyEnv();
    registerExtension(env);

    const levels = env.levels.list();
    assert.equal(levels.length, 1);
    assert.ok(levels[0]!.endsWith('/blocks/'), `level points at blocks/, got ${levels[0]}`);
    assert.equal(env.markdown.directiveHandler('gallery'), galleryHandler);
});

test('gallery blocks render the construct tree into gallery HTML', () => {
    const templateSet = new Templates();

    runWithTemplates(templateSet, () => {
        galleryTemplates();
        lightboxTemplates();
    });

    const tree = galleryNode(
        [{ src: 'a.png', alt: 'A' }, { src: 'b.png', alt: 'B' }],
        { imageMapping: { 'a.png': '/_ia1', 'b.png': '/_ib2' } },
    );
    const html = render(tree, { templates: templateSet });

    assert.ok(html.includes('class=gallery'));
    assert.ok(html.includes('gallery__item'));
    assert.ok(html.includes('href=/_ia1'));
    assert.ok(html.includes('alt=A>'));                    // first stays eager (no loading attr)
    assert.ok(html.includes('alt=B loading=lazy'));
    assert.ok(html.includes('<dialog class=lightbox'));
    assert.ok(html.includes('aria-label="Image viewer"'));
    assert.ok(html.includes('<button class=lightbox__close'));
    assert.ok(html.includes('aria-label="Close image"'));
    assert.ok(html.includes('autofocus'));
});
