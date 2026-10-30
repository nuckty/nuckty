/**
 * BEMJSON core types — the data model of the whole engine.
 *
 * A BemNode is one node of a UI tree described as data (not HTML). The renderer
 * walks the tree and emits HTML; templates (block/elem/modes) transform nodes
 * during the walk. Markdown content is also produced as BemNode trees, so the
 * same renderer handles both layout blocks and inline content.
 *
 * @module bem/types
 */

/** Modifier value: string, boolean (key-only), or absent. `null`/`undefined` => mod is dropped. */
export type ModVal = string | boolean | null | undefined;

/** Map of modifiers → values. `{ disabled: true }` renders class `block_disabled`. */
export type ModMap = Record<string, ModVal>;

/** Attribute value: string, boolean (bare attr), or absent. `null`/`undefined`/`false` => attr dropped. */
export type AttrVal = string | boolean | null | undefined;

/** Map of attribute names → values. `{ hidden: true }` renders bare `hidden`. */
export type AttrMap = Record<string, AttrVal>;

/**
 * A BEM entity reference used in `mix` — a block/element/mods triple without
 * content. Mirrors `@bem/sdk.naming.entity`'s data model (entity-as-data).
 */
export interface BemEntity {
    block: string;
    elem?: string;
    mods?: ModMap;
    elemMods?: ModMap;
}

export interface BemNode {
    /** Block name. Drives BEM class generation. */
    block?: string;
    /** Element name within the block. Renders `block__elem`. */
    elem?: string;
    /** Block modifiers → `block_mod[_val]` classes. Ignored when `elem` is set. */
    mods?: ModMap;
    /** Element modifiers → `block__elem_mod[_val]` classes. Used when `elem` is set. */
    elemMods?: ModMap;
    /** One or more entities whose classes are merged into this node's class list. */
    mix?: BemEntity | Array<BemEntity | string> | string;
    /** Children: a node, an array, a string (escaped), or null. */
    content?: BEMTree;
    /** Explicit HTML tag overrides templates. Default `div`; `false` renders only content. */
    tag?: string | false | undefined;
    /** HTML attributes. */
    attrs?: AttrMap;
    /** Extra non-BEM class appended last. */
    cls?: string;
    /** JS params: `true` emits empty block parameters; an object supplies `data-bem` values. */
    js?: boolean | Record<string, unknown>;
    /** `false` suppresses BEM class/`data-bem` generation entirely. Default `true`. */
    bem?: boolean;
    /**
     * Free-form template data; not serialized automatically. Templates may
     * expose values through content or attrs (e.g. a document title).
     */
    props?: Record<string, unknown>;
    /**
     * Trusted raw HTML string. Emitted verbatim: NOT escaped, NOT minimized.
     * Reserved for content we trust is already ideal (e.g. pre-built markup).
     * Prefer producing real BemNode children; use `raw` sparingly.
     */
    raw?: string;
}

/** A BEMJSON tree: nodes, text, nested arrays, or empty null/undefined/false positions. */
export type BEMTree = BemNode | BEMTree[] | string | null | undefined | false;
