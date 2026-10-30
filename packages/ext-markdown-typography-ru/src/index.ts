/**
 * @nuckty/ext-markdown-typography-ru — Russian typography markdown-extension.
 *
 * Registers a remark mdast plugin via `env.markdown.use(remarkTypographyRu)`
 * (openspec `ext-markdown-typography-ru`): it walks mdast text nodes and
 * rewrites spacing around an existing em-dash (`—`) with a non-breaking space
 * before it and a regular space after (`<word>&nbsp;— <text>`), the Russian
 * typographic convention. Code (`code`/`inlineCode`) is a separate node type
 * and is never visited, so code is skipped structurally.
 *
 * A site loads this extension only when it wants Russian typography; without
 * it, the core emits text verbatim with no typographic substitutions.
 *
 * @module @nuckty/ext-markdown-typography-ru
 */

import type { NucktyEnv } from '@nuckty/core';
export { remarkTypographyRu } from './typography-plugin.js';
export { applyRussianTypography } from './typography.js';

import { remarkTypographyRu } from './typography-plugin.js';

export function register(env: NucktyEnv): void {
    env.markdown.use(remarkTypographyRu);
}

export default register;
