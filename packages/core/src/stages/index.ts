/**
 * Default build stages. Content stages run in phases; finalizers run after every
 * phase, so files written by extension emit stages are compressed, published by
 * `.htaccess` and listed in the manifest. Finalizers keep named before/after hooks.
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

/**
 * Clear output and build intermediates before a fresh build. Preserve `serve/`,
 * the previews' runtime directory, so a running preview can still be stopped.
 */
export const cleanStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await fs.mkdir(ctx.buildDir, { recursive: true });
    for (const entry of await fs.readdir(ctx.buildDir)) {
        if (entry !== 'serve') {
            await fs.rm(path.join(ctx.buildDir, entry), { recursive: true, force: true });
        }
    }
    await fs.rm(ctx.outDir, { recursive: true, force: true });
    await fs.mkdir(ctx.outDir, { recursive: true });
};

/** Hook point of the resolve phase; the default build has no work here. */
const resolveStage: Stage<BuildContext> = async (): Promise<void> => {
};

/** Register the default stages in phase order and the finalizers in their fixed order. */
export function registerDefaultStages(pipeline: Pipeline): Pipeline {
    pipeline.registerStage('clean', cleanStage, { phase: 'clean' });
    pipeline.registerStage('images', imagesStage, { phase: 'prepare' });
    pipeline.registerStage('assets', assetsStage, { phase: 'prepare' });
    pipeline.registerStage('sitemap', sitemapStage, { phase: 'render' });
    pipeline.registerStage('css', cssStage, { phase: 'render' });
    pipeline.registerStage('js', jsStage, { phase: 'render' });
    pipeline.registerStage('resolve', resolveStage, { phase: 'resolve' });
    pipeline.registerStage('html', htmlStage, { phase: 'emit' });
    // `.htaccess` is part of the artifact, so it precedes the manifest scan;
    // nginx.conf goes to the build directory and comes last.
    pipeline.registerFinalizer('compression', compressionStage);
    pipeline.registerFinalizer('htaccess', htaccessStage);
    pipeline.registerFinalizer('manifest', manifestStage);
    pipeline.registerFinalizer('nginx', nginxStage);
    return pipeline;
}
