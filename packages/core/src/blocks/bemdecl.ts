import { createRequire } from 'node:module';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Read a BEM declaration for the given bundle as a flat array of block and
 * `block__elem` entity names.
 * Missing declarations are optional. Existing invalid declarations fail rather
 * than silently dropping the bundle. Later levels override earlier ones.
 */
export function readBemDeclaration(
    bundle: string,
    cwd: string,
    levels: string[],
): string[] {
    const bemdeclPath = [...levels].reverse()
        .map((level) => path.resolve(cwd, level, bundle, `${bundle}.bemdecl.js`))
        .find((candidate) => existsSync(candidate));

    if (!bemdeclPath) {
        return [];
    }
    try {
        const req = createRequire(import.meta.url);
        // Drop the require cache entry so a changed declaration reloads in the same process.
        const resolved = req.resolve(bemdeclPath);
        delete req.cache[resolved];
        const loaded = req(resolved) as unknown;
        if (Array.isArray(loaded)) {
            return dependencyNames(loaded);
        }
        if (loaded && typeof loaded === 'object') {
            const obj = loaded as Record<string, unknown>;

            if (Object.keys(obj).some((key) => key !== 'mustDeps' && key !== 'shouldDeps')) {
                throw new Error('Expected a CommonJS dependency array or mustDeps/shouldDeps object');
            }

            return [...new Set([
                ...dependencyNames(obj.mustDeps ?? []),
                ...dependencyNames(obj.shouldDeps ?? []),
            ])];
        }

        throw new Error('Expected a dependency array or mustDeps/shouldDeps object');
    } catch (cause) {
        throw new Error(`nuckty: invalid BEM declaration ${bemdeclPath}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    }
}

function nonEmptyName(value: unknown, what: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Each dependency must name ${what}`);
    }

    return value;
}

/**
 * Bundle entity names from declaration entries. A string names a block or a
 * `block__elem` element. An object `{ block }` names the block; `{ block, elem }`
 * names only that element (or each of an `elem` array); `{ block, elems }`
 * names the block and each listed element, as in BEM deps.
 */
function dependencyNames(value: unknown): string[] {
    if (!Array.isArray(value)) {
        throw new Error('Dependencies must be an array');
    }

    const names = value.flatMap((entry: unknown): string[] => {
        if (!entry || typeof entry !== 'object') {
            return [nonEmptyName(entry, 'a block')];
        }
        const record = entry as Record<string, unknown>;
        const block = nonEmptyName(record['block'], 'a block');
        const unknownKey = Object.keys(record).find((key) => !['block', 'elem', 'elems'].includes(key));

        if (unknownKey !== undefined) {
            throw new Error(`Unknown dependency field ${JSON.stringify(unknownKey)}`);
        }
        const elements = (field: string): string[] => {
            const list = record[field];

            if (list === undefined) {
                return [];
            }

            return (Array.isArray(list) ? list : [list]).map((elem) => `${block}__${nonEmptyName(elem, 'an element')}`);
        };

        if (record['elem'] !== undefined) {
            return elements('elem');
        }

        return [block, ...elements('elems')];
    });

    return [...new Set(names)];
}
