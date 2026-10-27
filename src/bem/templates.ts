/**
 * Template collection + matcher.
 *
 * Holds the declared templates and, for a given node, yields the matching
 * templates in order from least to most specific (so the renderer can compose
 * modes via `next()` walking the chain). Specificity:
 *
 *   named block 1, named element 2, block modifier 4, element modifier 8, predicate 16
 *
 * `block('*')` adds no block weight; its other selector conditions retain their
 * weights. A bare wildcard yields to a bare named block. Within equal
 * specificity, later declarations win (so a later `block('b')(...)` overrides an
 * earlier one).
 *
 * @module bem/templates
 */

import type { BemNode } from './types.js';
import type { Template } from './template-types.js';

export class Templates {
    private entries: Template[] = [];
    private counter = 0;

    add(t: Omit<Template, 'order'>): void {
        this.entries.push({ ...t, order: this.counter++ });
    }

    /** All declared templates (debugging/introspection). */
    all(): readonly Template[] {
        return this.entries;
    }

    /**
     * Match templates against a node, ordered from LEAST to MOST specific so the
     * renderer selects the strongest declaration and `next()` reaches weaker ones.
     */
    match(node: BemNode): Template[] {
        const matches: Array<{ t: Template; spec: number }> = [];

        for (const t of this.entries) {
            const spec = specificity(t, node);
            if (spec < 0) continue; // no match
            matches.push({ t, spec });
        }

        // Sort: ascending specificity, then ascending order (later declarations
        // are more specific within the same rank). The renderer walks low → high
        // and the highest wins as the final value.
        matches.sort((a, b) => a.spec - b.spec || a.t.order - b.t.order);
        return matches.map((m) => m.t);
    }
}

/**
 * Compute specificity for a template against a node, or -1 if no match.
 *
 * Rank bits (higher = more specific):
 *   1 = named block matched        (vs `*`)
 *   2 = elem matched (named)       (vs absent/`*`)
 *   4 = mod matched on block       (with correct val if specified)
 *   8 = elemMod matched
 *  16 = custom predicate matched
 */
function specificity(t: Template, node: BemNode): number {
    let rank = 0;

    // block
    if (t.block === '*') {
        rank += 0;
    } else if (node.block === t.block) {
        rank += 1;
    } else {
        return -1;
    }

    // elem
    if (t.elem === undefined) {
        // A block declaration never matches an element, including inherited context.
        if (node.elem) {
            return -1;
        }
    } else if (t.elem === '*') {
        if (!node.elem) {
            return -1;
        }
        rank += 0;
    } else if (node.elem === t.elem) {
        rank += 2;
    } else {
        return -1;
    }

    // mod on block (only meaningful when template targets block without elem)
    if (t.modName !== undefined) {
        if (node.elem) return -1; // a block-mod template doesn't match an elem node
        const mods = node.mods ?? {};
        if (!Object.hasOwn(mods, t.modName)) {
            return -1;
        }
        const val = mods[t.modName];
        if (val === null || val === undefined || val === false) return -1;
        if (t.modVal !== undefined) {
            if (val === true) {
                if (t.modVal !== true) return -1;
            } else if (String(val) !== t.modVal) {
                return -1;
            }
        }
        rank += 4;
    }

    // elemMod (only when template targets an elem)
    if (t.elemModName !== undefined) {
        if (!node.elem || (t.elem !== '*' && node.elem !== t.elem)) {
            return -1;
        }
        const mods = node.elemMods ?? {};
        if (!Object.hasOwn(mods, t.elemModName)) {
            return -1;
        }
        const val = mods[t.elemModName];
        if (val === null || val === undefined || val === false) return -1;
        if (t.elemModVal !== undefined) {
            if (val === true) {
                if (t.elemModVal !== true) return -1;
            } else if (String(val) !== t.elemModVal) {
                return -1;
            }
        }
        rank += 8;
    }

    // custom predicate
    if (t.predicate) {
        if (!t.predicate(node)) return -1;
        rank += 16;
    }

    return rank;
}

