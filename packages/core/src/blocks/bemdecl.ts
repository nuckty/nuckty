import { createRequire } from 'node:module';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

/** Resolve the blocks level (the one named `blocks`, else the last level). */
export function resolveBlocksLevel(levels: string[]): string | undefined {
    return levels.find((level) => level === 'blocks') ?? levels[levels.length - 1];
}

/**
 * Read a BEM declaration for the given bundle as a flat array of block names.
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
        // Dynamic CJS require with cache invalidation so swapped files reload
        // (1:1 with the original `loadBemDeclaration`).
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

function dependencyNames(value: unknown): string[] {
    if (!Array.isArray(value)) {
        throw new Error('Dependencies must be an array');
    }

    const names = value.map((entry: unknown) => {
        const name = entry && typeof entry === 'object' && 'block' in entry ? entry.block : entry;

        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Each dependency must name a block');
        }

        return name;
    });

    return [...new Set(names)];
}
