/**
 * @nuckty/ext-block-grid — multi-column content layout.
 *
 * Combines two extension types in one `register(env)` (openspec
 * `ext-block-grid`): the `grid` block via `env.levels` and the `:::grid`
 * markdown construct via `env.markdown.directive`. The construct expands into
 * `grid` BEMJSON whose items are the container's children; the block's CSS
 * lays them out in a responsive multi-column grid — no external CSS/JS
 * dependencies.
 *
 * @module @nuckty/ext-block-grid
 */

import type { DirectiveHandler, NucktyEnv } from '@nuckty/core';
import { fileURLToPath } from 'node:url';
import { extractItems, gridNode } from './grid.js';

export { extractItems, gridNode, paragraphText } from './grid.js';
export type { MdastNode } from './grid.js';

/**
 * Map the `:::grid` container to the grid tree; each cell renders its paragraph's
 * inline content (links, emphasis, images) through the core converter. Returns
 * `null` for a leaf or text directive and for a container without items — the
 * engine then falls back to the directive's plain content.
 */
export const gridHandler: DirectiveHandler = (node, _env, convert) => {
    if (node.type !== 'containerDirective') {
        return null;
    }
    const items = extractItems((node.children ?? []) as import('./grid.js').MdastNode[]);
    if (items.length === 0) {
        return null;
    }
    return gridNode(items.map((cell) => convert.inline(cell)));
};

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
    env.markdown.directive('grid', gridHandler);
}

export default register;
