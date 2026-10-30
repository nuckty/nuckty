/**
 * Renderer entry — the two-pass render (openspec `templates` spec).
 *
 *   render(tree, opts) = renderToHtml(renderToBemJson(tree, { templates }), { document })
 *
 * Pass 1 (`./render-to-bemjson.ts`) applies nu.ts templates and returns a fully
 * resolved `BEMTree` (no HTML). Pass 2 (`./render-to-html.ts`) serializes that
 * resolved tree to minimal HTML (open tags, attrs, optional-end-tag omission by
 * the next sibling's resolved tag, SVG void-shaped self-close, `raw` passthrough).
 *
 * `output: 'bemjson'` stops after pass 1 and returns the tree (typed via an
 * overload so callers without the option still get a `string`). The two passes
 * are also exported individually (`renderToBemJson`, `renderToHtml`).
 *
 * @module bem/render
 */

import type { BEMTree } from './types.js';
import { Templates } from './templates.js';
import { renderToBemJson } from './render-to-bemjson.js';
import { renderToHtml } from './render-to-html.js';

export { renderToBemJson } from './render-to-bemjson.js';
export { renderToHtml } from './render-to-html.js';
export type { BemJsonOptions } from './render-to-bemjson.js';
export type { HtmlOptions } from './render-to-html.js';

export interface RenderOptions {
    templates: Templates;
    /** When true, prepend `<!doctype html>` and append `\n\n` (document render). */
    document?: boolean;
    /**
     * `'html'` (default) serializes to a string; `'bemjson'` stops after pass 1
     * and returns the resolved `BEMTree` (openspec `templates` spec).
     */
    output?: 'html' | 'bemjson';
}

/** Render to minimal HTML (default `output: 'html'`). */
export function render(tree: BEMTree, opts: RenderOptions & { output?: 'html' }): string;
/** Stop after pass 1 and return the resolved `BEMTree`. */
export function render(tree: BEMTree, opts: RenderOptions & { output: 'bemjson' }): BEMTree;
export function render(tree: BEMTree, opts: RenderOptions): string | BEMTree {
    const resolved = renderToBemJson(tree, { templates: opts.templates });
    if (opts.output === 'bemjson') {
        return resolved;
    }
    return renderToHtml(resolved, { document: opts.document });
}
