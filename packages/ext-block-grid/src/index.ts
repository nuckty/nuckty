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
 * Map the `:::grid` container to the grid tree. Returns `null` for a container
 * without items — the engine then falls back to the directive's plain content.
 */
export const gridHandler: DirectiveHandler = (node) => {
    const items = extractItems((node.children ?? []) as import('./grid.js').MdastNode[]);
    if (items.length === 0) return null;
    // The engine's handler contract is structural ({ raw?, ...unknown }); the
    // built BemNode satisfies it shape-wise, the cast bridges the interface.
    return gridNode(items) as unknown as { raw?: string; [k: string]: unknown };
};

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
    env.markdown.directive('grid', gridHandler);
}

export default register;
