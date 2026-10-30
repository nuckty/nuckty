/**
 * HTML emission stage — prepares document data, delegates document construction
 * to the consumer, and writes minimal HTML to `<outDir>/html/`.
 *
 * For each page in `ctx.store.sitemap.pages`:
 *   1. pass the page, its content tree, assets, target and alternates to `env.document`;
 *   2. render the returned document tree, content included, in one two-pass render;
 *   3. write `<outDir>/html/<flat>.html` (URL → flat filename mapping).
 *
 * @module stages/html
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { render } from '../bem/render.js';
import { resolveAlternates, type Target, type Alternates } from '../targets/config.js';
import type { SitemapPage } from './types.js';
import { parseIndentedSitemap, processSitemap } from './sitemap.js';
import { loadBuildConfig } from '../utils/build-config.js';
import type { DocumentData } from '../document/document.js';

export const htmlStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const sitemap = ctx.store.sitemap;
    if (!sitemap || !sitemap.pages) {
        return;
    }

    const assets = {
        css: ctx.store.cssHash ?? {},
        js: ctx.store.jsHash ?? {},
        images: ctx.store.imageMapping ?? {},
        videos: ctx.store.videoHash ?? {},
    };

    const htmlDir = path.join(ctx.outDir, 'html');
    await assertArtifactPath(ctx.outDir, htmlDir);
    await fs.mkdir(htmlDir, { recursive: true });

    const templates = ctx.templates;

    // Reject all collisions before writing any page.
    const flatByUrl = new Map<string, string>();
    for (const url of Object.keys(sitemap.pages)) {
        const flat = urlToFlat(url);
        const existing = flatByUrl.get(flat);
        if (existing !== undefined) {
            throw new Error(`nuckty: html — URL collision: "${existing}" and "${url}" both flatten to "${flat}"`);
        }
        flatByUrl.set(flat, url);
    }

    for (const [url, page] of Object.entries(sitemap.pages)) {
        const currentTarget = ctx.store.currentTarget;
        const allTargetsList = ctx.store.allTargets;
        const alternates: Alternates = currentTarget && allTargetsList
            ? resolveAlternates(currentTarget, allTargetsList, url, await siblingPages(ctx, currentTarget, allTargetsList))
            : new Map();

        const data: DocumentData = {
            page,
            content: page.tree ?? [],
            sitemap,
            assets,
            alternates,
        };

        if (currentTarget) {
            data.target = currentTarget;
        }
        if (ctx.lang) {
            data.lang = ctx.lang;
        }

        const document = await ctx.env.document.render(data);
        const html = render(document, { templates, document: true }) as string;
        const file = path.join(htmlDir, urlToFlat(url));
        await assertArtifactPath(ctx.outDir, file);
        await fs.writeFile(file, html, 'utf8');
    }
};

/**
 * Pages of the targets that share the current target's group, read from their
 * own `sitemap.yml`; a target without a sitemap file is left out. Cached per build.
 */
async function siblingPages(ctx: BuildContext, current: Target, targets: Target[]): Promise<Record<string, Record<string, SitemapPage>>> {
    const cached = ctx.cache.get('siblingPages') as Record<string, Record<string, SitemapPage>> | undefined;

    if (cached) {
        return cached;
    }
    const pages: Record<string, Record<string, SitemapPage>> = Object.create(null);

    for (const target of targets) {
        if (!current.group || target.group !== current.group || target.name === current.name) {
            continue;
        }
        let source: string;
        try {
            source = await fs.readFile(path.join(ctx.cwd, target.configDir, 'sitemap.yml'), 'utf8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                continue;
            }
            throw error;
        }
        pages[target.name] = processSitemap(parseIndentedSitemap(source), loadBuildConfig(ctx.cwd, target.configDir).site.rootTitle).pages;
    }
    ctx.cache.set('siblingPages', pages);

    return pages;
}

/**
 * Map a URL to a flat HTML filename: `/` → `index.html`, `/a/b` → `a_b.html`.
 * Also validates the canonical form: no trailing slash (`/a/` would flatten
 * to a trailing `_`, diverging from the hosting redirect to `/a`), and at most
 * 5 path segments — the documented hosting limit.
 */
export function urlToFlat(url: string): string {
    if (url === '/' || url === '') {
        return 'index.html';
    }
    if (url.endsWith('/')) {
        throw new Error(`nuckty: html — page URL "${url}" must not end with a trailing slash (use "${url.replace(/\/+$/, '')}")`);
    }
    const segments = url.replace(/^\//, '').split('/');
    if (!url.startsWith('/') || /[\\?#%\x00-\x20]/.test(url) || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
        throw new Error(`nuckty: html — non-canonical page URL "${url}"`);
    }
    if (segments.length > 5) {
        throw new Error(`nuckty: html — page URL "${url}" has ${segments.length} path segments; hosting supports at most 5`);
    }
    const artifactRoots = ['html', 'css', 'js', 'svg', 'xml', 'png', 'jpg', 'webp', 'avif'];
    if (/\.(?:html|css|js|svg|xml|jpg|jpeg|png|gif|ico|avif|webp|pdf|zip|ini|mp4)$/i.test(url)
        || /^\/(?:brotli|gzip)(?:\/|$)/.test(url)
        || /^\/_i[a-f0-9]+$/.test(url)
        || ['/robots.txt', '/manifest.json', '/__nuckty_404'].includes(url)
        || (segments.length === 1 && artifactRoots.includes(segments[0]!))) {
        throw new Error(`nuckty: html — page URL "${url}" is reserved for hosting or artifact files`);
    }
    return segments.join('_') + '.html';
}
