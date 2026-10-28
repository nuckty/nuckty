import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { assertArtifactPath, resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { generateHash } from '../utils/hash.js';
import { getBuildConfig } from '../utils/build-config.js';
import type { BundleHashEntry } from './types.js';

/** Resolve the absolute path to a block's JS file (block or element form). */
function blockJsPath(sourcePath: string, block: string): string {
    const parts = block.split('__');
    const blockName = parts[0]!;
    const elementName = parts[1];
    if (elementName) {
        return path.join(sourcePath, blockName, `__${elementName}`, `${block}.js`);
    }
    return path.join(sourcePath, block, `${block}.js`);
}

/** Write an empty hash entry for a bundle that had no JS files. */
async function saveEmptyHashFile(bundle: string, buildDir: string): Promise<void> {
    const buildHashPath = await resolveBuildFile(buildDir, 'hash-js.json');
    let allHashes: Record<string, BundleHashEntry> = Object.create(null);
    try {
        allHashes = JSON.parse(await fs.readFile(buildHashPath, 'utf8')) as Record<string, BundleHashEntry>;
    } catch {
        // start fresh
    }
    Object.defineProperty(allHashes, bundle, {
        value: { hash: 'empty', filename: 'empty.js', url: '/empty.js', source: [] },
        enumerable: true,
        configurable: true,
    });
    await fs.writeFile(buildHashPath, JSON.stringify(allHashes, null, 2));
}

async function buildBundle(
    bundle: string,
    root: string,
    buildDir: string,
    siteDir: string,
    bemdecl: string[],
    levels: string[],
): Promise<BundleHashEntry | null> {
    const sourcePaths = levels.map((level) => path.resolve(root, level));
    if (bemdecl.length === 0) return null;

    // Collect JS entry points from declared blocks.
    const entryPoints: string[] = [];
    for (const block of bemdecl) {
        for (const sourcePath of sourcePaths) {
            const jsPath = blockJsPath(sourcePath, block);
            try {
                await fs.access(jsPath);
                entryPoints.push(jsPath);
            } catch {
                // skip missing
            }
        }
    }
    if (entryPoints.length === 0) return null;

    // Generate temp entry that imports all block JS files.
    const entryContent = entryPoints.map((p) => `import ${JSON.stringify(p)};`).join('\n');
    const entryPath = await resolveBuildFile(buildDir, `${bundle}-entry.js`);
    await fs.writeFile(entryPath, entryContent);

    let jsContent: string;
    try {
        const result = await esbuild.build({
            entryPoints: [entryPath],
            bundle: true,
            minify: true,
            write: false,
            format: 'iife',
            target: ['es2018'],
            logLevel: 'silent',
        });
        jsContent = result.outputFiles[0]!.text;
    } catch (e) {
        // STAGE-01: a real bundling failure (syntax error in block JS, missing
        // import, esbuild config error) must FAIL the build — swallowing it
        // produced a "successful" build with the JS bundle silently missing.
        throw new Error(
            `nuckty: js stage — bundling "${bundle}" failed: ` +
                `${e instanceof Error ? e.message : String(e)}`,
        );
    }

    const finalHash = generateHash(jsContent);
    const hashedFilename = `${finalHash}.js`;

    const buildHashPath = await resolveBuildFile(buildDir, 'hash-js.json');
    let allHashes: Record<string, BundleHashEntry> = Object.create(null);
    try {
        allHashes = JSON.parse(await fs.readFile(buildHashPath, 'utf8')) as Record<string, BundleHashEntry>;
    } catch {
        // start fresh
    }
    const entry: BundleHashEntry = {
        hash: finalHash,
        filename: hashedFilename,
        url: `/${finalHash}.js`,
        source: entryPoints.map((file) => path.relative(root, file)),
    };
    Object.defineProperty(allHashes, bundle, { value: entry, enumerable: true, configurable: true });
    await fs.writeFile(buildHashPath, JSON.stringify(allHashes, null, 2));

    const jsDir = path.join(siteDir, 'js');
    await assertArtifactPath(siteDir, path.join(jsDir, hashedFilename));
    await fs.mkdir(jsDir, { recursive: true });
    await fs.writeFile(path.join(jsDir, hashedFilename), jsContent);

    return entry;
}

/**
 * JS stage. Builds every configured bundle and stores the per-bundle hash map
 * in `ctx.store.jsHash`. Bundles with no JS files get an empty entry written to
 * `.build/hash-js.json` (mirrors `JSBuilder.saveEmptyHashFile`).
 */
export const jsStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const root = ctx.cwd;
    await fs.mkdir(ctx.buildDir, { recursive: true });
    await assertArtifactPath(ctx.outDir);
    await fs.mkdir(ctx.outDir, { recursive: true });

    const bundles = getBuildConfig(ctx).site.bundles;
    const blockDeps = (ctx.store['blockDeps'] as Record<string, string[]> | undefined) ?? {};
    const registeredLevels = ctx.env.levels.list();
    const levels = registeredLevels.length > 0 ? registeredLevels : getBuildConfig(ctx).levels;

    const jsHash: Record<string, BundleHashEntry> = Object.create(null);
    for (const bundle of bundles) {
        const entry = await buildBundle(bundle, root, ctx.buildDir, ctx.outDir, (Object.hasOwn(blockDeps, bundle) ? blockDeps[bundle] : undefined) ?? [], levels);
        if (entry) {
            jsHash[bundle] = entry;
        } else {
            // No JS for this bundle — record an empty entry (1:1 with original).
            await saveEmptyHashFile(bundle, ctx.buildDir);
        }
    }

    ctx.store['jsHash'] = jsHash;
};

