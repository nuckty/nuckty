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

import type { BemNode, ModMap } from './types.js';
import type { Template } from './template-types.js';

export class Templates {
    private entries: Template[] = [];
    private counter = 0;

    add(t: Omit<Template, 'order'>): void {
        this.entries.push({ ...t, order: this.counter++ });
    }

    /**
     * Match templates against a node, ordered from LEAST to MOST specific so the
     * renderer selects the strongest declaration and `next()` reaches weaker ones.
     */
    match(node: BemNode): Template[] {
        const matches: Array<{ t: Template; spec: number }> = [];

        for (const t of this.entries) {
            const spec = specificity(t, node);

            if (spec >= 0) {
                matches.push({ t, spec });
            }
        }
        matches.sort((a, b) => a.spec - b.spec || a.t.order - b.t.order);

        return matches.map((m) => m.t);
    }
}

/** Specificity of a template for a node, or -1 when the template does not match. */
function specificity(t: Template, node: BemNode): number {
    let rank = 0;

    if (t.block !== '*') {
        if (node.block !== t.block) {
            return -1;
        }
        rank += 1;
    }
    // A block declaration never matches an element; an element declaration matches only elements.
    if (t.elem === undefined) {
        if (node.elem) {
            return -1;
        }
    } else if (t.elem === '*') {
        if (!node.elem) {
            return -1;
        }
    } else if (node.elem === t.elem) {
        rank += 2;
    } else {
        return -1;
    }
    if (t.modName !== undefined) {
        if (!hasModifier(t.elem === undefined ? node.mods : node.elemMods, t.modName, t.modVal)) {
            return -1;
        }
        rank += t.elem === undefined ? 4 : 8;
    }
    if (t.predicate) {
        if (!t.predicate(node)) {
            return -1;
        }
        rank += 16;
    }

    return rank;
}

/** An own, set modifier, equal to `expected` when one is given. */
function hasModifier(mods: ModMap | undefined, name: string, expected: string | true | undefined): boolean {
    if (!mods || !Object.hasOwn(mods, name)) {
        return false;
    }
    const value = mods[name];

    if (value === null || value === undefined || value === false) {
        return false;
    }
    if (expected === undefined) {
        return true;
    }

    return value === true ? expected === true : String(value) === expected;
}
