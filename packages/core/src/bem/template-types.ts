/**
 * nu.ts template types — predicates, modes, templates.
 *
 * The authoring model:
 * - entry + sugar: `block('x')` (no `match` noise)
 * - fluent predicate: `.elem().mod().when()`
 * - terminal: a modes object literal `{ tag, content, attrs, ... }`
 * - chaining via a `next` parameter in mode functions (not a floating applyNext)
 *
 * Specificity adds selector-kind weights: named block 1, named element 2, block
 * modifier 4, element modifier 8, custom `when` 16. Larger sums win; equal
 * specificity favors the later declaration.
 *
 * @module bem/template-types
 */

import type { AttrMap, BemNode, BEMTree, ModMap } from './types.js';

export type TemplateNode<P> = Omit<BemNode, 'props'> & { props?: P };

/** A custom predicate over the node being matched. */
export type Predicate = (node: BemNode) => boolean;

/** Output mode value or function; next() is undefined when no own/lower value exists. */
export type ModeVal<T, P = Record<string, unknown>> = T | ((node: TemplateNode<P>, next: () => T | undefined) => T | undefined);

/**
 * The modes object — the body of a template declaration. Each field is either a
 * direct value or a `(node, next) => value` function. Output modes set resolved
 * node fields; control modes replace or wrap the tree before serialization.
 *
 * Sugar modes from bem-xjst (`add*`, `appendContent`, `extend`, `local`) are
 * dropped — TS spreads/closures cover them.
 */
export interface Modes<P = Record<string, unknown>> {
    // --- output modes ---
    tag?: ModeVal<string | false, P>;
    content?: ModeVal<BEMTree, P>;
    attrs?: ModeVal<AttrMap, P>;
    mods?: ModeVal<ModMap, P>;
    elemMods?: ModeVal<ModMap, P>;
    mix?: ModeVal<BemNode['mix'], P>;
    cls?: ModeVal<string, P>;
    js?: ModeVal<BemNode['js'], P>;
    bem?: ModeVal<boolean, P>;

    // --- control modes ---
    /** Full takeover of node rendering. Return a BEMTree to render instead. */
    def?: (node: TemplateNode<P>, next: () => BEMTree) => BEMTree;
    /** Replace the current node with a different one. */
    replace?: (node: TemplateNode<P>, next: () => BEMTree) => BemNode;
    /** Wrap the current node in new markup. `next()` yields the wrapped node. */
    wrap?: (node: TemplateNode<P>, next: () => BemNode) => BemNode;
}

/** Internal: a registered template = predicate descriptor + modes body. */
export interface Template {
    block: string | '*';
    elem?: string | '*';
    /** Modifier of the selected entity: block modifier, or element modifier when `elem` is set. */
    modName?: string;
    modVal?: string | true;
    predicate?: Predicate;
    modes: Modes;
    /** Declaration order; higher = later = wins on equal specificity. */
    order: number;
}

