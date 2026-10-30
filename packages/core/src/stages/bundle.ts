/** Shared steps of the CSS and JS stages: locating block files and publishing hashed bundles. */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { BuildContext } from '../pipeline/pipeline.js';
import { getBuildConfig } from '../utils/build-config.js';
import { generateHash } from '../utils/hash.js';
import type { BundleHashEntry } from './types.js';

/** Bundles to build and the levels to search, from the build context. */
export function bundleInputs(ctx: BuildContext): { bundles: string[]; levels: string[]; entities: (bundle: string) => string[] } {
    const config = getBuildConfig(ctx);
    const blockDeps = ctx.store.blockDeps ?? {};
    const registered = ctx.env.levels.list();

    return {
        bundles: config.site.bundles,
        levels: registered.length > 0 ? registered : config.levels,
        entities: (bundle) => (Object.hasOwn(blockDeps, bundle) ? blockDeps[bundle] : undefined) ?? [],
    };
}

/**
 * Existing files `<level>/<block>/<block>.<extension>` (or `<level>/<block>/__<elem>/<block>__<elem>.<extension>`)
 * of the declared entities, in declaration order and, for one entity, in level order.
 */
export async function blockFiles(root: string, levels: string[], entities: string[], extension: string): Promise<string[]> {
    const files: string[] = [];

    for (const entity of entities) {
        const [block, elem] = entity.split('__');
        const relative = elem ? path.join(block!, `__${elem}`, `${entity}.${extension}`) : path.join(entity, `${entity}.${extension}`);

        for (const level of levels) {
            const file = path.join(path.resolve(root, level), relative);

            try {
                await fs.access(file);
                files.push(file);
            } catch {
                // The entity has no file of this kind on this level.
            }
        }
    }

    return files;
}

/** Publish `content` as `<outDir>/<extension>/<hash>.<extension>` and return its entry. */
export async function writeBundle(outDir: string, root: string, extension: 'css' | 'js', content: string, sources: string[]): Promise<BundleHashEntry> {
    const hash = generateHash(content);
    const filename = `${hash}.${extension}`;
    const directory = path.join(outDir, extension);

    await assertArtifactPath(outDir, path.join(directory, filename));
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), content);

    return { hash, filename, url: `/${filename}`, source: sources.map((file) => path.relative(root, file)) };
}
