import type { BEMTree, BemEntity, BemNode } from './types.js';

/** Entity fields of a composed node; HTML display modes stay in nu.ts templates. */
export interface EntityOptions {
    mods?: NonNullable<BemNode['mods']>;
    elemMods?: NonNullable<BemNode['elemMods']>;
    mix?: BemEntity | BemEntity[];
}

/** Compose a BEM tree node; HTML display modes are declared in nu.ts templates. */
export function b(
    block: string,
    elem?: string,
    content: BEMTree = null,
    props: Record<string, unknown> = {},
    entity: EntityOptions = {},
): BemNode {
    return { block, ...(elem ? { elem } : {}), ...entity, content, ...(Object.keys(props).length ? { props } : {}) };
}

/** Expose only the props explicitly named by an HTML template as attributes; other types are dropped. */
export function attributes(node: BemNode, names: string[]): NonNullable<BemNode['attrs']> {
    const result: NonNullable<BemNode['attrs']> = {};

    for (const name of names) {
        const value = node.props?.[name];

        if (typeof value === 'string' || typeof value === 'boolean') {
            result[name] = value;
        }
    }

    return result;
}
