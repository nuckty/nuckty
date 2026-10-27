/**
 * `:::grid` construct logic (openspec `ext-block-grid`): turn the container's
 * children into the `grid` BemNode tree — each child paragraph becomes one
 * grid item (cell) with its plain text.
 *
 * Children arrive as mdast nodes (the engine hands the raw directive node to
 * the handler); we duck-type on `node.type` to stay free of mdast deps, the
 * same way the reference consumer handlers do.
 *
 * @module grid
 */

import type { BemNode } from '@nuckty/core';

/** Structural mdast view of the directive's children (duck-typed). */
export interface MdastNode {
    type: string;
    value?: string;
    url?: string;
    alt?: string | null;
    children?: MdastNode[];
}

/** Flatten a paragraph's inline children to plain text (soft breaks kept as `\n`). */
export function paragraphText(paragraph: MdastNode): string {
    let out = '';
    for (const c of paragraph.children ?? []) {
        if (c.type === 'text' || c.type === 'inlineCode') {
            out += c.value ?? '';
        } else if (c.type === 'break') {
            out += '\n';
        } else if (c.type === 'image') {
            out += `![${c.alt ?? ''}](${c.url ?? ''})`;
        } else if (c.children) {
            out += paragraphText(c);
        }
    }
    return out;
}

/** Collect item texts: each non-empty paragraph child of the container is one item. */
export function extractItems(children: MdastNode[]): string[] {
    const items: string[] = [];
    for (const child of children) {
        if (child.type !== 'paragraph') {
            throw new Error(`Grid supports paragraph cells only; received ${child.type}`);
        }
        const text = paragraphText(child).trim();
        if (text) items.push(text);
    }
    return items;
}

/** Build the grid tree: one `grid__item` cell per item text (escaped by the serializer). */
export function gridNode(items: string[]): BemNode {
    return {
        block: 'grid',
        content: items.map((text) => ({ block: 'grid', elem: 'item', content: text })),
    };
}
