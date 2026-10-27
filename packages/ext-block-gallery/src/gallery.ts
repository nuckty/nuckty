/**
 * `:::gallery` construct logic (openspec `ext-block-gallery`): collect the
 * container's images, rewrite their URLs through the shared image-mapping, and
 * build the `gallery` BemNode tree — a responsive grid of links, each opening
 * the lightbox; every image except the first in that gallery carries `loading=lazy`.
 *
 * Children arrive as mdast nodes (the engine hands the raw directive node to
 * the handler); we duck-type on `node.type` to stay free of mdast deps, the
 * same way the reference consumer handlers do.
 *
 * @module gallery
 */

import type { BemNode } from '@nuckty/core';
import type { ImageMappingEnv } from '@nuckty/core';
import { transformImagePathShared } from '@nuckty/core';

/** Structural mdast view of the directive's children (duck-typed). */
export interface MdastNode {
    type: string;
    url?: string;
    alt?: string | null;
    children?: MdastNode[];
}

export interface GalleryImage {
    src: string;
    alt: string;
}

/**
 * Collect `![]()` images from the container's children. Remark collapses a run
 * of images (no blank lines between them) into one paragraph with image
 * children; images separated by blank lines come as separate paragraphs — so
 * looking inside paragraphs covers both.
 */
export function extractImages(children: MdastNode[]): GalleryImage[] {
    const images: GalleryImage[] = [];
    const push = (node: MdastNode): void => {
        if (node.url) images.push({ src: node.url, alt: node.alt ?? '' });
    };
    for (const child of children) {
        if (child.type === 'image') {
            push(child);
        } else if (child.type === 'paragraph') {
            for (const c of child.children ?? []) {
                if (c.type === 'image') push(c);
            }
        }
    }
    return images;
}

export interface GalleryOptions {
    /** Optional data-group tag for consumers; the runtime uses the nearest gallery. */
    groupId?: string;
}

/**
 * Build the gallery tree: `gallery__item` links with `gallery__image` inside,
 * plus the trailing `lightbox` container the gallery script toggles.
 */
export function galleryNode(images: GalleryImage[], env: ImageMappingEnv, opts: GalleryOptions = {}): BemNode {
    const groupId = opts.groupId ?? 'gallery';
    const content: BemNode[] = images.map((image, i) => {
        const src = transformImagePathShared(image.src, env);
        const imgAttrs: Record<string, string> = { src, alt: image.alt };
        if (i > 0) imgAttrs.loading = 'lazy';
        return {
            block: 'gallery',
            elem: 'item',
            tag: 'a',
            attrs: { href: src, 'data-group': groupId },
            content: { block: 'gallery', elem: 'image', tag: 'img', attrs: imgAttrs },
        };
    });
    content.push({
        block: 'lightbox',
        attrs: { 'aria-label': 'Image viewer' },
        content: { block: 'lightbox', elem: 'close', attrs: { type: 'button', autofocus: true, 'aria-label': 'Close image' }, content: '×' },
    });
    return { block: 'gallery', content };
}
