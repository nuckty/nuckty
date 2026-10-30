import { promises as fs } from 'node:fs';
import * as esbuild from 'esbuild';
import { assertArtifactPath, resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { blockFiles, bundleInputs, writeBundle } from './bundle.js';
import type { BundleHashEntry } from './types.js';

/** Bundle the declared blocks' scripts into one IIFE, or return null when there are none. */
async function buildBundle(ctx: BuildContext, bundle: string, files: string[]): Promise<BundleHashEntry | null> {
    if (files.length === 0) {
        return null;
    }
    const entry = await resolveBuildFile(ctx.buildDir, `${bundle}-entry.js`);
    await fs.writeFile(entry, files.map((file) => `import ${JSON.stringify(file)};`).join('\n'));

    let js: string;
    try {
        const result = await esbuild.build({
            entryPoints: [entry],
            bundle: true,
            minify: true,
            write: false,
            format: 'iife',
            target: ['es2018'],
            logLevel: 'silent',
        });
        js = result.outputFiles[0]!.text;
    } catch (error) {
        // A bundling failure fails the build rather than publishing pages without their script.
        throw new Error(`nuckty: js stage — bundling "${bundle}" failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }

    return writeBundle(ctx.outDir, ctx.cwd, 'js', js, files);
}

/** JS stage. Builds every configured bundle with scripts and stores the per-bundle hash map in `ctx.store.jsHash`. */
export const jsStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await fs.mkdir(ctx.buildDir, { recursive: true });
    await assertArtifactPath(ctx.outDir);
    await fs.mkdir(ctx.outDir, { recursive: true });

    const { bundles, levels, entities } = bundleInputs(ctx);
    const jsHash: Record<string, BundleHashEntry> = Object.create(null);

    for (const bundle of bundles) {
        const entry = await buildBundle(ctx, bundle, await blockFiles(ctx.cwd, levels, entities(bundle), 'js'));

        if (entry) {
            jsHash[bundle] = entry;
        }
    }

    ctx.store.jsHash = jsHash;
};
