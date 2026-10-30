/**
 * Pass 1 — apply nu.ts templates to a BEMJSON tree, returning a fully resolved
 * `BEMTree` (no HTML, no minification). This is the structural pass (openspec
 * `templates` spec): control modes (`replace`/`wrap`/`def`) reshape the tree and
 * output modes (`tag`/`content`/`attrs`/`mods`/`elemMods`/`mix`/`cls`/`js`/`bem`)
 * fold to concrete values. `next()` descends toward lower specificity (applyNext
 * semantics). Pass 2 (`renderToHtml`) serializes the resolved tree.
 *
 * Control-mode composition semantics (arch review RENDER-03 decision table):
 *   1. Output modes fold FIRST over the matched chain into `result`
 *      (tag/attrs/content/... with `next()` toward lower specificity).
 *   2. `replace(result, next→result)` — full takeover; the returned subtree is
 *      resolved fresh, and templates of the NEW block apply to it.
 *   3. `wrap(result, next→result)` — the wrapper subtree resolves fresh; the
 *      wrapped original (from `next()`) already carries folded output modes.
 *   4. `def(node, next→result)` — full takeover of the node position; any
 *      BEMTree return value is resolved (RENDER-04: string/array/null/false/
 *      node all legal).
 *
 * Loop protection: inside the subtree a control mode PRODUCED, the same
 * block's control modes are suppressed for that branch. Previously suppressed
 * blocks remain suppressed when another control mode produces a subtree.
 * `wrap(x)`→`{...x...}` self-recursion dies at depth one, while output modes,
 * other templates, and other blocks still apply to fresh nodes. Originals
 * returned by next() keep their folded values without a second application.
 * Each block's control can fire once per branch, including alternating wrappers.
 *
 * @module bem/render-to-bemjson
 */

import type { BemNode, BEMTree } from './types.js';
import type { Modes, Template } from './template-types.js';
import { Templates } from './templates.js';

export interface BemJsonOptions {
    templates: Templates;
}

/**
 * Apply templates to the tree, returning the resolved `BEMTree`. Strings/null
 * pass through; arrays resolve element-wise; a node resolves itself (templates
 * applied) and recurses into its content.
 */
export function renderToBemJson(tree: BEMTree, opts: BemJsonOptions): BEMTree {
    return resolveLevel(tree, '', opts, new Set(), new Map());
}

/**
 * Resolve one level with branch-local control suppression and folded originals.
 */
function resolveLevel(
    tree: BEMTree,
    parentBlock: string,
    opts: BemJsonOptions,
    suppressed: ReadonlySet<string>,
    folded: ReadonlyMap<BemNode, BemNode>,
): BEMTree {
    if (tree === null || tree === undefined || tree === false) {
        return tree;
    }
    if (typeof tree === 'string') {
        return tree;
    }
    if (Array.isArray(tree)) {
        return tree.flatMap((child) => {
            const resolved = resolveLevel(child, parentBlock, opts, suppressed, folded);
            return resolved === null || resolved === undefined || resolved === false ? [] : resolved;
        });
    }
    return resolveNode(tree, parentBlock, opts, suppressed, folded);
}

/** Result of applying matched templates to one node. */
interface ApplyResult {
    node: BEMTree;
    folded: BemNode;
    /** Whether a control mode fired (result pending child resolve()). */
    controlled: boolean;
    /** Block that produced the subtree (for suppression) when `controlled`. */
    controlSource?: string;
}

/**
 * Resolve a single node: apply templates, then recurse into its content.
 */
function resolveNode(
    child: BEMTree,
    parentBlock: string,
    opts: BemJsonOptions,
    suppressed: ReadonlySet<string>,
    folded: ReadonlyMap<BemNode, BemNode>,
): BEMTree {
    if (child === null || child === undefined || child === false) {
        return null;
    }
    if (typeof child === 'string') {
        return child;
    }
    if (Array.isArray(child)) {
        return resolveLevel(child, parentBlock, opts, suppressed, folded);
    }

    const node = child;
    if (node.raw !== undefined) {
        return node;
    }

    const block = node.block ?? parentBlock;
    const resolved: BemNode = folded.get(node) ?? (node.block ? node : { ...node, block });

    // NB: a control mode matching a new node INSIDE a suppressed subtree is
    // filtered out below; a node OUTSIDE a fresh wrapper — normal rules.
    const applied = folded.has(node)
        ? { node: resolved, folded: resolved, controlled: false }
        : applyTemplates(resolved, opts.templates.match(resolved), suppressed);
    if (applied.controlled) {
        // Resolve the subtree the mode produced: fresh matching for other
        // blocks, but the source block's control modes stay suppressed inside
        // it (loop guard; output modes of all blocks still apply).
        const nextSuppressed = new Set(suppressed);
        nextSuppressed.add(applied.controlSource!);
        const nextFolded = new Map(folded);
        nextFolded.set(node, applied.folded);
        nextFolded.set(resolved, applied.folded);
        nextFolded.set(applied.folded, applied.folded);
        return resolveLevel(applied.node, parentBlock, opts, nextSuppressed, nextFolded);
    }

    const finalNode = applied.folded;
    const content = resolveLevel(
        finalNode.content ?? null,
        finalNode.block ?? block,
        opts,
        suppressed,
        folded,
    );

    if (content === null || content === undefined) {
        const { content: _omit, ...rest } = finalNode;
        return rest;
    }
    return { ...finalNode, content };
}

/** Fold output modes over the matched chain (applyNext semantics). */
function foldOutputModes(node: BemNode, matched: Template[]): BemNode {
    if (matched.length === 0) {
        return node;
    }
    const fields: Array<keyof Modes> = ['tag', 'content', 'attrs', 'mods', 'elemMods', 'mix', 'cls', 'js', 'bem'];

    let changed = false;
    let result: Record<string, unknown> = node as Record<string, unknown>;
    for (const field of fields) {
        if (field === 'tag' && node.tag !== undefined) {
            continue;
        }

        const setters = matched.filter((t) => t.modes[field] !== undefined);
        if (setters.length === 0) {
            continue;
        }

        if (!changed) { result = { ...(node as Record<string, unknown>) }; changed = true; }
        const own = (node as Record<string, unknown>)[field];
        const composeNext = (idx: number): unknown => {
            if (idx < 0) {
                return own;
            }
            const t = setters[idx]!;
            const fn = t.modes[field];
            if (typeof fn !== 'function') {
                return fn;
            }
            return (fn as (n: BemNode, next: () => unknown) => unknown)(node, () => composeNext(idx - 1));
        };
        const value = composeNext(setters.length - 1);
        if (value === undefined) {
            delete result[field];
        } else {
            result[field] = value;
        }
    }
    return result as BemNode;
}

/**
 * Apply the matched templates' modes under the RENDER-03 semantics:
 * output modes fold first, then the highest-priority control mode
 * (replace > wrap > def) consumes the folded node. Control modes of
 * already suppressed blocks are ignored (loop protection inside that block's own
 * control-mode result subtree).
 */
function applyTemplates(node: BemNode, matched: Template[], suppressed: ReadonlySet<string>): ApplyResult {
    // Output modes fold over ALL matched templates FIRST so `next()` inside
    // replace/wrap/def yields the fully composed node (tag/attrs/content/...
    // applied), including suppressed control templates' output-only modes.
    const result = foldOutputModes(node, matched);

    for (let i = matched.length - 1; i >= 0; i--) {
        const m = matched[i]!;
        if (!m.modes.replace || suppressed.has(m.block)) {
            continue;
        }
        return { node: m.modes.replace(result, () => result), folded: result, controlled: true, controlSource: m.block };
    }
    for (let i = matched.length - 1; i >= 0; i--) {
        const m = matched[i]!;
        if (!m.modes.wrap || suppressed.has(m.block)) {
            continue;
        }
        return { node: m.modes.wrap(result, () => result), folded: result, controlled: true, controlSource: m.block };
    }
    for (let i = matched.length - 1; i >= 0; i--) {
        const m = matched[i]!;
        if (!m.modes.def || suppressed.has(m.block)) {
            continue;
        }
        // `def` is a full takeover: its return value is a BEMTree — a node,
        // a string, an array, `null` or `false` are all legal (RENDER-04).
        return { node: m.modes.def(node, () => result), folded: result, controlled: true, controlSource: m.block };
    }

    return { node: result, folded: result, controlled: false };
}

