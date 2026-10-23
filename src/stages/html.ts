/**
 * HTML emission stage — prepares document data, delegates document construction
 * to the consumer, and writes minimal HTML to `<outDir>/html/`.
 *
 * For each page in `ctx.store.sitemap.pages`:
 *   1. take the page's content tree (markdown → BemNode, produced by sitemap);
 *   2. pass page, content, assets, target and alternates to `env.document`;
 *   3. serialize via the two-pass engine (`renderToBemJson` → `renderToHtml`);
 *   4. write `<outDir>/html/<flat>.html` (URL → flat filename mapping).
 *
 * @module stages/html
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { render } from '../bem/render.js';
import { resolveAlternates, type Target, type Alternates } from '../targets/config.js';
import { postprocessHtml } from '../markdown/html-postprocess.js';
import type { ImageMappingEnv } from '../markdown/image-mapping.js';
import type { SitemapArtifact, BundleHashEntry } from './types.js';
import type { DocumentData } from '../document/document.js';

export const htmlStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const sitemap = ctx.store['sitemap'] as SitemapArtifact | undefined;
    if (!sitemap || !sitemap.pages) return;

    const assets = {
        css: (ctx.store['cssHash'] as Record<string, BundleHashEntry> | undefined) ?? {},
        js: (ctx.store['jsHash'] as Record<string, BundleHashEntry> | undefined) ?? {},
        images: (ctx.store['imageMapping'] as Record<string, string> | undefined) ?? {},
        videos: (ctx.store['videoHash'] as Record<string, string> | undefined) ?? {},
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
        const content = page.tree ?? [];

        // Resolve raw HTML image references in content. Typography belongs to
        // opt-in markdown extensions; page chrome bypasses this mapping pass.
        const contentHtml = render(content, { templates, document: false });
        let contentForLayout: DocumentData['content'] = [];
        if (contentHtml !== '') {
            // The image-mapping env carries the page's inputPath so raw-HTML
            // `<img>` tags embedded in the markdown source (text-with-icon)
            // are rewritten through the same section-aware resolver as
            // markdown `![](...)` images.
            const imageEnv: ImageMappingEnv = {
                imageMapping: assets.images,
                sourceFile: page.file,
            };
            const ip = (page as { inputPath?: string }).inputPath;
            if (ip !== undefined) imageEnv.inputPath = ip;
            contentForLayout = [{ raw: postprocessHtml(contentHtml, imageEnv) }];
        }

        const currentTarget = ctx.store['currentTarget'] as Target | undefined;
        const allTargetsList = ctx.store['allTargets'] as Target[] | undefined;
        let alternates: Alternates = new Map();

        if (currentTarget && allTargetsList) {
            alternates = resolveAlternates(currentTarget, allTargetsList, url);
        }

        const data: DocumentData = {
            page,
            content: contentForLayout,
            sitemap,
            assets,
            alternates,
        };

        if (currentTarget) data.target = currentTarget;
        if (ctx.lang) data.lang = ctx.lang;

        const document = await ctx.env.document.render(data);
        const html = render(document, { templates, document: true }) as string;
        const file = path.join(htmlDir, urlToFlat(url));
        await assertArtifactPath(ctx.outDir, file);
        await fs.writeFile(file, html, 'utf8');
    }
};

/**
 * Map a URL to a flat HTML filename: `/` → `index.html`, `/a/b` → `a_b.html`.
 * Also validates the canonical form: no trailing slash (`/a/` would flatten
 * to a trailing `_`, diverging from the hosting redirect to `/a`), and at most
 * 5 path segments — the documented hosting limit.
 */
export function urlToFlat(url: string): string {
    if (url === '/' || url === '') return 'index.html';
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
        || /^\/_[cjsi][a-f0-9]+$/.test(url)
        || ['/robots.txt', '/manifest.json', '/__nuckty_404'].includes(url)
        || (segments.length === 1 && artifactRoots.includes(segments[0]!))) {
        throw new Error(`nuckty: html — page URL "${url}" is reserved for hosting or artifact files`);
    }
    return segments.join('_') + '.html';
}

