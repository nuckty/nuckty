/**
 * `:::grid` construct logic (openspec `ext-block-grid`): turn the container's
 * children into the `grid` BemNode tree — each child paragraph becomes one
 * grid item (cell) rendered like an ordinary paragraph's inline content.
 *
 * Children arrive as mdast nodes, read through the structural `MdastNode` view.
 *
 * @module grid
 */

import type { BEMTree, BemNode } from '@nuckty/core';

/** Structural mdast view of the directive's children (duck-typed). */
export interface MdastNode {
    type: string;
    value?: string;
    url?: string;
    alt?: string | null;
    children?: MdastNode[];
}

/** Plain text of a paragraph's inline children, used to detect cells without text. */
export function paragraphText(paragraph: MdastNode): string {
    let out = '';
    for (const c of paragraph.children ?? []) {
        if (c.type === 'text' || c.type === 'inlineCode') {
            out += c.value ?? '';
        } else if (c.type === 'break') {
            out += '\n';
        } else if (c.type === 'image') {
            out += c.alt ?? '';
        } else if (c.children) {
            out += paragraphText(c);
        }
    }
    return out;
}

function hasImage(node: MdastNode): boolean {
    return node.type === 'image'
        || node.type === 'imageReference'
        || (node.type === 'html' && /<img\b/i.test(node.value ?? ''))
        || (node.children ?? []).some(hasImage);
}

/** Collect cells: the inline children of each paragraph with text or an image, and each HTML block; other blocks are errors. */
export function extractItems(children: MdastNode[]): MdastNode[][] {
    const items: MdastNode[][] = [];
    for (const child of children) {
        if (child.type === 'html') {
            if ((child.value ?? '').trim()) {
                items.push([child]);
            }
            continue;
        }
        if (child.type !== 'paragraph') {
            throw new Error(`Grid supports paragraph cells only; received ${child.type}`);
        }
        if (paragraphText(child).trim() || hasImage(child)) {
            items.push(child.children ?? []);
        }
    }
    return items;
}

/** Build the grid tree: one `grid__item` cell per rendered paragraph. */
export function gridNode(items: BEMTree[]): BemNode {
    return {
        block: 'grid',
        content: items.map((text) => ({ block: 'grid', elem: 'item', content: text })),
    };
}
