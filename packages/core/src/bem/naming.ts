import type { BemNode, ModMap } from './types.js';

const ELEM_DELIMITER = '__';
const MOD_DELIMITER = '_';

/** Build the class string of a node: entity, its modifiers, mixed entities, then `cls`. */
export function classify(node: BemNode): string | null {
    const { block, elem, mix, cls } = node;

    if (!block && !cls && !mix) {
        return null;
    }

    const classes: string[] = [];

    if (block && node.bem !== false) {
        pushEntity(classes, block, elem, elem ? node.elemMods : node.mods);
    }
    if (mix && node.bem !== false) {
        for (const item of Array.isArray(mix) ? mix : [mix]) {
            if (typeof item === 'string') {
                if (item) {
                    classes.push(item);
                }
            } else {
                pushEntity(classes, item.block, item.elem, item.elem ? item.elemMods : item.mods);
            }
        }
    }
    if (cls) {
        classes.push(cls);
    }

    return classes.length > 0 ? classes.join(' ') : null;
}

/** Push `block[__elem]` and one `_mod[_value]` class per set modifier. */
function pushEntity(classes: string[], block: string, elem: string | undefined, mods: ModMap | undefined): void {
    const base = elem ? `${block}${ELEM_DELIMITER}${elem}` : block;

    if (!base) {
        return;
    }
    classes.push(base);
    for (const [name, value] of Object.entries(mods ?? {})) {
        if (value === null || value === undefined || value === false) {
            continue;
        }
        classes.push(value === true
            ? `${base}${MOD_DELIMITER}${name}`
            : `${base}${MOD_DELIMITER}${name}${MOD_DELIMITER}${String(value)}`);
    }
}
