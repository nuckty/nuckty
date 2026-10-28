import type { BEMTree, BemEntity, BemNode } from '@nuckty/core';

interface EntityOptions {
    mods?: BemNode['mods'];
    elemMods?: BemNode['elemMods'];
    mix?: BemEntity | BemEntity[];
}

/** Compose a BEM tree; HTML display modes are declared in nu.ts templates. */
export function b(
    block: string,
    elem?: string,
    content: BEMTree = null,
    props: Record<string, unknown> = {},
    entity: EntityOptions = {},
): BemNode {
    return { block, ...(elem ? { elem } : {}), ...entity, content, ...(Object.keys(props).length ? { props } : {}) };
}

/** Expose only the fields explicitly named by the HTML template. */
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
