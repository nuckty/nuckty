/**
 * @nuckty/ext-block-gallery — image gallery with lightbox.
 *
 * Combines two extension types in one `register(env)` (openspec
 * `ext-block-gallery`): the `gallery` block (with the `lightbox` helper) via
 * `env.levels`, and the `:::gallery` markdown construct via
 * `env.markdown.directive`. The construct expands into `gallery` BEMJSON with
 * the images rewritten through `image-mapping.json`; the block lays them out
 * as a responsive CSS grid, and the built-in lightbox script opens a full-size
 * view on click — no external JS libraries.
 *
 * @module @nuckty/ext-block-gallery
 */

import type { DirectiveHandler, NucktyEnv } from '@nuckty/core';
import type { ImageMappingEnv } from '@nuckty/core';
import { fileURLToPath } from 'node:url';
import { extractImages, galleryNode } from './gallery.js';

export { extractImages, galleryNode } from './gallery.js';
export type { GalleryImage, GalleryOptions, MdastNode } from './gallery.js';

/**
 * Map the `:::gallery` container to the gallery tree. Returns `null` for a
 * container without images — the engine then falls back to the directive's
 * plain content.
 */
export const galleryHandler: DirectiveHandler = (node, env) => {
    const images = extractImages((node.children ?? []) as import('./gallery.js').MdastNode[]);
    if (images.length === 0) return null;
    // The engine's handler contract is structural ({ raw?, ...unknown }); the
    // built BemNode satisfies it shape-wise, the cast bridges the interface.
    return galleryNode(images, env as ImageMappingEnv) as unknown as { raw?: string; [k: string]: unknown };
};

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
    env.markdown.directive('gallery', galleryHandler);
}

export default register;
