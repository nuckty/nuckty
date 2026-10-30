/** Test oracle: serialize a resolved tree with every start and end tag, without optional-tag omission. */

import type { AttrMap, BemNode, BEMTree } from '../../bem/types.js';
import { classify } from '../../bem/naming.js';
import { escapeAttr, escapeText, VOID_TAGS, BOOLEAN_ATTRS, normalizeHtmlName } from '../../bem/html/escape.js';

/** Serialize a BEMTree to an HTML string (no minimization). */
export function serialize(tree: BEMTree): string {
    return serializeNode(tree, '');
}

function serializeNode(tree: BEMTree, parentBlock: string): string {
    if (tree === null || tree === undefined || tree === false) {
        return '';
    }
    if (typeof tree === 'string') {
        return escapeText(tree);
    }
    if (Array.isArray(tree)) {
        return tree.map((child) => serializeNode(child, parentBlock)).join('');
    }

    const node = tree as BemNode;

    // Raw trusted string: emit verbatim, no escaping, no minimization.
    if (node.raw !== undefined) {
        return node.raw;
    }

    // Default the tag. `false` means render only content (no wrapper).
    const tag = node.tag === false ? null : (node.tag ?? 'div');

    // Inherit the block name for children when this node is elem-only (`{elem}`
    // without `block`), matching BEMJSON's contextual block resolution.
    const block = node.block ?? parentBlock;
    const nodeWithBlock: BemNode = node.block ? node : { ...node, block };

    // Content first (so `tag:false` and void elements still emit children/attrs consistently).
    const inner = serializeNode(node.content ?? null, block);

    if (!tag) {
        return inner;
    }

    // Tag with `tag` but no block and no class-yielding fields: still emit the tag.
    const cls = classify(nodeWithBlock);
    const attrsStr = serializeAttrs(node.attrs, node.js, nodeWithBlock);

    if (VOID_TAGS.has(normalizeHtmlName(tag))) {
        // Void element: no closing tag, no children.
        return `<${tag}${cls ? ` class="${escapeAttr(cls)}"` : ''}${attrsStr}>`;
    }

    return `<${tag}${cls ? ` class="${escapeAttr(cls)}"` : ''}${attrsStr}>${inner}</${tag}>`;
}

/** Serialize `attrs` + `js` into the attribute string (with leading space when non-empty). */
function serializeAttrs(attrs: AttrMap | undefined, js: BemNode['js'], node: BemNode): string {
    const parts: string[] = [];

    if (attrs) {
        for (const [name, val] of Object.entries(attrs)) {
            if (val === null || val === undefined || val === false) {
                continue;
            }
            if (val === true || BOOLEAN_ATTRS.has(normalizeHtmlName(name))) {
                parts.push(` ${name}`);
            } else {
                parts.push(` ${name}="${escapeAttr(String(val))}"`);
            }
        }
    }

    // js: truthy boolean or object → mark the block for client init.
    if (js && node.bem !== false && node.block) {
        const params = js === true ? {} : js;
        const dataBem = JSON.stringify({ [node.block]: params });
        parts.push(` data-bem="${escapeAttr(dataBem)}"`);
    }

    return parts.join('');
}
