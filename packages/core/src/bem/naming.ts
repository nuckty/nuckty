import type { BemEntity, BemNode, ModMap, NamingPreset } from './types.js';
import { classicPreset } from './types.js';

/** BEM entity parsed out of a class string (best-effort, mainly for diagnostics). */
export interface ParsedEntity {
    block: string;
    elem?: string;
    modName?: string;
    modVal?: string | true;
}

/**
 * Stringify a single BEM entity (block + optional elem + optional mod) to a
 * class string, per the preset's delimiters. Mirrors bem-sdk's `stringify`.
 *
 *   stringify({ block: 'b' })                              → 'b'
 *   stringify({ block: 'b', elem: 'e' })                   → 'b__e'
 *   stringify({ block: 'b', mods: { m: true } })          → 'b_m'
 *   stringify({ block: 'b', elem: 'e', elemMods: { m: 'v' } }) → 'b__e_m_v'
 */
export function stringifyEntity(entity: BemEntity, preset: NamingPreset = classicPreset): string {
    const { block, elem } = entity;
    if (!block) {
        return '';
    }

    const parts: string[] = [block];
    if (elem) {
        parts.push(preset.elem, elem);
    }

    const modifiers = elem ? entity.elemMods : entity.mods;
    const mod = modifiers ? pickMod(modifiers) : undefined;
    if (mod) {
        parts.push(preset.mod, mod.name);
        if (mod.val !== true) {
            parts.push(preset.modVal, mod.val);
        }
    }
    return parts.join('');
}

/** Build the full class string for a node: base + mods/elemMods + mix + cls. */
export function classify(node: BemNode, preset: NamingPreset = classicPreset): string | null {
    const { block, elem, mix, cls } = node;
    if (!block && !cls && !mix) {
        return null;
    }

    const classes: string[] = [];

    // Base: block | block__elem (only when bem classes are wanted).
    if (block && node.bem !== false) {
        const base = elem ? `${block}${preset.elem}${elem}` : block;
        classes.push(base);

        // mods (on block) or elemMods (on elem) → base_mod[_val] suffixes.
        const ownMods: ModMap | undefined = elem ? node.elemMods : node.mods;
        if (ownMods) {
            for (const [name, val] of Object.entries(ownMods)) {
                if (val === null || val === undefined || val === false) {
                    continue;
                }
                // mod class is one token: base_mod  OR  base_mod_val
                const modClass = val === true
                    ? `${base}${preset.mod}${name}`
                    : `${base}${preset.mod}${name}${preset.modVal}${String(val)}`;
                classes.push(modClass);
            }
        }
    }

    // mix: merge classes from other entities (strings or entities).
    if (mix && node.bem !== false) {
        appendMix(classes, mix, preset);
    }

    // cls: raw extra class, appended last as-is.
    if (cls) {
        classes.push(cls);
    }

    return classes.length > 0 ? classes.join(' ') : null;
}

/** Parse a class string back to an entity (diagnostics/dev-tools only). */
export function parseClass(input: string, preset: NamingPreset = classicPreset): ParsedEntity | null {
    const e = input.indexOf(preset.elem);
    if (e === -1) {
        // block or block_mod[_val]
        const m = input.indexOf(preset.mod);
        if (m === -1) {
            return { block: input };
        }
        const block = input.slice(0, m);
        const rest = input.slice(m + preset.mod.length);
        const v = rest.indexOf(preset.modVal);
        if (v === -1) {
            return { block, modName: rest };
        }
        return { block, modName: rest.slice(0, v), modVal: rest.slice(v + preset.modVal.length) };
    }
    const block = input.slice(0, e);
    const afterElem = input.slice(e + preset.elem.length);
    const m = afterElem.indexOf(preset.mod);
    if (m === -1) {
        return { block, elem: afterElem };
    }
    const elem = afterElem.slice(0, m);
    const rest = afterElem.slice(m + preset.mod.length);
    const v = rest.indexOf(preset.modVal);
    if (v === -1) {
        return { block, elem, modName: rest };
    }
    return { block, elem, modName: rest.slice(0, v), modVal: rest.slice(v + preset.modVal.length) };
}

// ---- internals -------------------------------------------------------------

function pickMod(mods: ModMap): { name: string; val: string | true } | undefined {
    for (const [name, val] of Object.entries(mods)) {
        if (val === null || val === undefined || val === false) {
            continue;
        }
        return { name, val: val === true ? true : String(val) };
    }
    return undefined;
}

function appendMix(out: string[], mix: BemNode['mix'], preset: NamingPreset): void {
    if (!mix) {
        return;
    }
    const list = Array.isArray(mix) ? mix : [mix];
    for (const item of list) {
        if (typeof item === 'string') {
            if (item) {
                out.push(item);
            }
            continue;
        }
        // A mixed entity: build its base + its own mods, push each class piece.
        const base = item.elem ? `${item.block}${preset.elem}${item.elem}` : item.block;
        if (base) {
            out.push(base);
        }
        const mods = item.elem ? item.elemMods : item.mods;
        if (mods) {
            for (const [name, val] of Object.entries(mods)) {
                if (val === null || val === undefined || val === false) {
                    continue;
                }
                const modClass = val === true
                    ? `${base}${preset.mod}${name}`
                    : `${base}${preset.mod}${name}${preset.modVal}${String(val)}`;
                out.push(modClass);
            }
        }
    }
}

