/**
 * `:::gallery` construct logic (openspec `ext-block-gallery`): collect the
 * container's images, rewrite their URLs through the shared image mapping and
 * build the `gallery` tree; every image except the first is lazy-loaded.
 * Children arrive as mdast nodes, read through the structural `MdastNode` view.
 *
 * @module gallery
 */

import type { BemNode } from '@nuckty/core';
import type { ImageMappingEnv } from '@nuckty/core';
import { transformImagePathShared } from '@nuckty/core';

/** Structural mdast view of the directive's children (duck-typed). */
export interface MdastNode {
    type: string;
    value?: string;
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
        if (node.url) {
            images.push({ src: node.url, alt: node.alt ?? '' });
        }
    };
    const reject = (node: MdastNode): never => {
        throw new Error(`Gallery supports images only; received ${node.type}`);
    };
    const blank = (node: MdastNode): boolean => (node.type === 'text' && !(node.value ?? '').trim()) || node.type === 'break';
    for (const child of children) {
        if (child.type === 'image') {
            push(child);
        } else if (child.type === 'paragraph') {
            for (const c of child.children ?? []) {
                if (c.type === 'image') {
                    push(c);
                } else if (!blank(c)) {
                    reject(c);
                }
            }
        } else {
            reject(child);
        }
    }
    return images;
}

/**
 * Build the gallery tree as data: one `gallery__item` per image with its
 * mapped URL, alt text and lazy-loading flag, then the `lightbox` the gallery
 * script opens. The templates own the markup; `lang` selects the lightbox labels.
 */
export function galleryNode(images: GalleryImage[], env: ImageMappingEnv & { lang?: string | undefined }): BemNode {
    const content: BemNode[] = images.map((image, i) => ({
        block: 'gallery',
        elem: 'item',
        props: { src: transformImagePathShared(image.src, env), alt: image.alt, lazy: i > 0 },
    }));

    content.push({ block: 'lightbox', props: { lang: env.lang } });

    return { block: 'gallery', content };
}
