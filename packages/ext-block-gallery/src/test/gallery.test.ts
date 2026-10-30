/**
 * Tests for @nuckty/ext-block-gallery (openspec `ext-block-gallery`):
 * - `extractImages` collects `![]()` images from container paragraphs (a run
 *   of images collapses into one paragraph; blank lines split paragraphs);
 * - `galleryNode` rewrites image srcs through the shared image-mapping, marks
 *   every image except the first lazy, and appends the `lightbox` with the page language;
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
        { imageMapping: { 'free/light.png': '/_i62e5723492d14dc0', 'free/seats.png': '/_i9f8e7d6a1b2c3d4', 'free/door.png': '/_i0123456789abcdef' }, lang: 'ru' },
    );
    assert.deepEqual(node, {
        block: 'gallery',
        content: [
            { block: 'gallery', elem: 'item', props: { src: '/_i62e5723492d14dc0', alt: 'Light', lazy: false } },
            { block: 'gallery', elem: 'item', props: { src: '/_i9f8e7d6a1b2c3d4', alt: 'Seats', lazy: true } },
            { block: 'gallery', elem: 'item', props: { src: '/_i0123456789abcdef', alt: 'Door', lazy: true } },
            { block: 'lightbox', props: { lang: 'ru' } },
        ],
    });
});

const convert = { inline: () => [], blocks: () => [] };

test('galleryHandler maps a container with images and falls back on an empty one', () => {
    const withImages = galleryHandler(
        { name: 'gallery', children: [paragraph(image('a.png'))] },
        { imageMapping: { 'a.png': '_iaaa' } },
        convert,
    );
    assert.ok(withImages);
    assert.equal((withImages as { block?: string }).block, 'gallery');

    const empty = galleryHandler({ name: 'gallery', children: [paragraph({ type: 'text' })] }, { imageMapping: {} }, convert);
    assert.equal(empty, null);
});

test('register adds the blocks level and maps the gallery directive', () => {
    const env = new NucktyEnv();
    registerExtension(env);

    const levels = env.levels.list();
    assert.equal(levels.length, 1);
    assert.ok(levels[0]!.endsWith('/blocks/'), `level points at blocks/, got ${levels[0]}`);
    assert.equal(env.markdown.directiveMappings().get('gallery'), galleryHandler);
});

test('gallery blocks render the construct tree into gallery HTML with localized lightbox labels', () => {
    const templateSet = new Templates();

    runWithTemplates(templateSet, () => {
        galleryTemplates();
        lightboxTemplates();
    });

    const html = (lang?: string): string => render(galleryNode(
        [{ src: 'a.png', alt: 'A' }, { src: 'b.png', alt: 'B' }],
        { imageMapping: { 'a.png': '/_ia1', 'b.png': '/_ib2' }, lang },
    ), { templates: templateSet });

    assert.equal(html('en'), '<div class=gallery><a class=gallery__item href=/_ia1><img class=gallery__image src=/_ia1 alt=A></a><a class=gallery__item href=/_ib2><img class=gallery__image src=/_ib2 alt=B loading=lazy></a><dialog class=lightbox aria-label="Image viewer"><button class=lightbox__close type=button autofocus aria-label="Close image">×</button></dialog></div>');
    assert.match(html('ru'), /<dialog class=lightbox aria-label="Просмотр изображения"><button class=lightbox__close type=button autofocus aria-label="Закрыть изображение">/);
    assert.match(html(), /aria-label="Image viewer"/);
});

test('extractImages rejects captions, links and other content instead of dropping them', () => {
    const image = (url: string): MdastNode => ({ type: 'image', url, alt: url });
    const paragraph = (...children: MdastNode[]): MdastNode => ({ type: 'paragraph', children });

    assert.deepEqual(extractImages([paragraph(image('a.png'), { type: 'text', value: '\n' }, image('b.png'), { type: 'break' })]).map((item) => item.src), ['a.png', 'b.png']);
    assert.throws(() => extractImages([paragraph(image('a.png'), { type: 'text', value: ' подпись' })]), /images only; received text/);
    assert.throws(() => extractImages([paragraph({ type: 'link', children: [image('a.png')] })]), /received link/);
    assert.throws(() => extractImages([{ type: 'heading', children: [] }]), /received heading/);
});
