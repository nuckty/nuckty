import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { readBemDeclaration } from './bemdecl.js';
import type { Templates } from '../bem/templates.js';
import { runWithTemplates } from '../bem/template-context.js';

/** A block module exports its declarations as `templates()`. */
interface BlockModule {
    default?: () => void | Promise<void>;
}

/** Per-bundle BEM declaration (block names), produced by {@link loadBlocks}. */
export type BlockDeps = Record<string, string[]>;

/**
 * Load all blocks for the given bundles into `templates`. For each
 * bundle, reads `<level>/<bundle>/<bundle>.bemdecl.js` (CJS), walks the block
 * list, and for each block searches the levels (later wins) for
 * `<level>/<block>/<block>.nu.ts`, imports it, and calls
 * `templates()`. Blocks with no `.nu.ts` entry (CSS-only blocks) are skipped.
 *
 * Returns the per-bundle declaration (block names) so the CSS/JS stages can
 * bundle by deps without re-reading the bemdecl files.
 *
 * @param templates collection populated by block declarations
 * @param cwd consumer root
 * @param levels block-search levels (from `env.levels` / `config/levels.json`)
 * @param bundles bundle names to load (`page`, `page-index`, …)
 * @returns per-bundle block-name lists
 */
export async function loadBlocks(
    templates: Templates,
    cwd: string,
    levels: string[],
    bundles: string[],
): Promise<BlockDeps> {
    const loaded = new Set<string>();
    const blockDeps: BlockDeps = Object.create(null);

    for (const bundle of bundles) {
        const decl = readBemDeclaration(bundle, cwd, levels);
        blockDeps[bundle] = decl;
        for (const block of decl) {
            const entryPath = findBlockEntry(block, cwd, levels);
            if (!entryPath || loaded.has(entryPath)) continue;
            loaded.add(entryPath);
            const mod = (await import(pathToFileURL(entryPath).href)) as BlockModule;

            if (typeof mod.default !== 'function') {
                throw new Error(`nuckty: block template "${entryPath}" must export default templates()`);
            }

            await runWithTemplates(templates, mod.default);
        }
    }
    return blockDeps;
}

/**
 * Search levels (later wins) for `<level>/<block>/<block>.nu.ts`.
 */
function findBlockEntry(block: string, cwd: string, levels: string[]): string | null {
    for (let i = levels.length - 1; i >= 0; i--) {
        const levelDir = path.resolve(cwd, levels[i]!);
        const candidate = path.join(levelDir, block, `${block}.nu.ts`);

        if (existsSync(candidate)) return candidate;
    }
    return null;
}
