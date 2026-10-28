/**
 * Default phase stages and finalizers. All extension emit stages finish before
 * compression, hosting output, manifest and nginx. Finalizers retain named
 * before/after hooks, so hosting customizations precede the manifest scan.
 * @module stages/index
 */

import type { Pipeline, Stage, BuildContext } from '../pipeline/pipeline.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sitemapStage } from './sitemap.js';
import { cssStage } from './css.js';
import { jsStage } from './js.js';
import { imagesStage } from './images.js';
import { assetsStage } from './assets.js';
import { compressionStage } from './compression.js';
import { manifestStage } from './manifest.js';
import { nginxStage } from './nginx.js';
import { htaccessStage } from './htaccess.js';
import { htmlStage } from './html.js';

/** Re-export the individual stages for direct registration / testing. */
export { sitemapStage } from './sitemap.js';
export { cssStage } from './css.js';
export { jsStage } from './js.js';
export { imagesStage } from './images.js';
export { assetsStage } from './assets.js';
export { compressionStage } from './compression.js';
export { manifestStage } from './manifest.js';
export { nginxStage, generateNginxConfig } from './nginx.js';
export { htaccessStage, generateHtaccess } from './htaccess.js';
export type {
    SitemapArtifact,
    SitemapPage,
    BundleHashEntry,
    ImageStatEntry,
    BuildStore,
} from './types.js';
export { parseSitemapLine, parseIndentedSitemap, buildFullUrl, processSitemap } from './sitemap.js';
export { processImageReferences, inlineHashedSVGs } from './css.js';
export { generate as generateManifest } from './manifest.js';
export { htmlStage, urlToFlat } from './html.js';

/**
 * Clear output and build intermediates before a fresh build. Preserve preview
 * PID, runtime configuration and logs so the running preview can still be stopped.
 */
export const cleanStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    // Runtime files belong to the preview process, including its stop identity.
    const runtimeFiles = new Set(['nginx.pid', 'nginx-serve.conf', 'nginx-logs']);

    await fs.mkdir(ctx.buildDir, { recursive: true });
    for (const entry of await fs.readdir(ctx.buildDir)) {
        if (!runtimeFiles.has(entry)) {
            await fs.rm(path.join(ctx.buildDir, entry), { recursive: true, force: true });
        }
    }
    await fs.rm(ctx.outDir, { recursive: true, force: true });
    await fs.mkdir(ctx.outDir, { recursive: true });
};

/**
 * Legacy no-op HTML helper. The default pipeline registers htmlStage instead.
 */
export const htmlPlaceholderStage: Stage<BuildContext> = async (_ctx: BuildContext): Promise<void> => {
};

/**
 * No-op preserving the resolve phase. The sitemap stage currently resolves
 * content links and anchors; extensions may add work in this phase.
 */
export const resolvePlaceholderStage: Stage<BuildContext> = async (_ctx: BuildContext): Promise<void> => {
};

/**
 * Register all default build stages into a pipeline in the canonical phase
 * ordering. Returns the pipeline for chaining.
 */
export function registerDefaultStages(pipeline: Pipeline): Pipeline {
    pipeline.registerStage('clean', cleanStage, { phase: 'clean' });
    // prepare
    pipeline.registerStage('images', imagesStage, { phase: 'prepare' });
    pipeline.registerStage('assets', assetsStage, { phase: 'prepare' });
    // render
    pipeline.registerStage('sitemap', sitemapStage, { phase: 'render' });
    pipeline.registerStage('css', cssStage, { phase: 'render' });
    pipeline.registerStage('js', jsStage, { phase: 'render' });
    // resolve: named no-op hook point
    pipeline.registerStage('resolve', resolvePlaceholderStage, { phase: 'resolve' });
    // emit: only the content emitters are pipeline stages. The finalizers
    // (compression → htaccess → manifest → nginx) deliberately stay OUT of the
    // phase registration and run via `finalizeArtifact()` AFTER
    // `pipeline.run()` completes — extension emit stages then land their files
    // before compression/manifest see them (RUNTIME-009: an extension stage
    // registered in the emit phase used to run after compression+manifest and
    // its files missed both).
    pipeline.registerStage('html', htmlStage, { phase: 'emit' });
    pipeline.registerFinalizer('compression', compressionStage);
    pipeline.registerFinalizer('htaccess', htaccessStage);
    pipeline.registerFinalizer('manifest', manifestStage);
    pipeline.registerFinalizer('nginx', nginxStage);
    return pipeline;
}

/**
 * Finalization pass (RUNTIME-009): run AFTER `pipeline.run(ctx)` so every
 * extension emit stage has written its files. Fixed order, same reasoning as
 * before: compression first, then `.htaccess` (published with the artifact,
 * listed by the manifest), then the manifest scan, then nginx.conf (goes to
 * buildDir, not published).
 */
export async function finalizeArtifact(ctx: import('../pipeline/pipeline.js').BuildContext, pipeline?: Pipeline): Promise<void> {
    if (pipeline) {
        await pipeline.finalize(ctx);
        return;
    }
    await compressionStage(ctx);
    await htaccessStage(ctx);
    await manifestStage(ctx);
    await nginxStage(ctx);
}

/** Canonical stage names per phase, for tests/diagnostics. */
export const DEFAULT_STAGE_ORDER: ReadonlyArray<{ name: string; phase: import('../pipeline/pipeline.js').Phase }> = [
    { name: 'clean', phase: 'clean' },
    { name: 'images', phase: 'prepare' },
    { name: 'assets', phase: 'prepare' },
    { name: 'sitemap', phase: 'render' },
    { name: 'css', phase: 'render' },
    { name: 'js', phase: 'render' },
    { name: 'resolve', phase: 'resolve' },
    { name: 'html', phase: 'emit' },
    // Finalizers run via `finalizeArtifact()` after `pipeline.run()` (not
    // pipeline stages): compression, htaccess, manifest, nginx — see the
    // registerDefaultStages doc above (RUNTIME-009).
];

