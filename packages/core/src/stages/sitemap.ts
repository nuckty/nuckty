import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { createMarkdown } from '../markdown/index.js';
import type { MarkdownOptions } from '../markdown/index.js';
import { buildAnchorMap, resolvePageAnchors } from '../markdown/resolve-anchors.js';
import { resolveBuildFile } from './artifact-path.js';
import { getBuildConfig } from '../utils/build-config.js';

import { getFileTimestamp } from '../utils/timestamp.js';
import type {
    SitemapArtifact,
    SitemapPage,
} from './types.js';

/** Parsed sitemap line: `Name [url, file.md, { layout: '...' }]`. */
export interface ParsedLine {
    title: string;
    url: string;
    file: string;
    meta: Record<string, unknown>;
}

export function parseSitemapLine(line: string): ParsedLine | null {
    // The title runs up to the last bracketed definition, so titles may contain brackets.
    const match = line.match(/^(.+)\s*\[([^,[\]]+),\s*([^,[\]]+)(?:,\s*(\{.*\s*))?\]$/);
    if (!match) {
        return null;
    }
    const result: ParsedLine = {
        title: match[1]!.trim(),
        url: match[2]!.trim(),
        file: path.posix.normalize(match[3]!.trim()),
        meta: {},
    };
    const metaStr = match[4];
    if (metaStr) {
        try {
            // Tokenize quoted values before normalizing legacy keys and quotes.
            // Replacing every word before ':' also corrupted URLs inside strings.
            const jsonString = metaStr.replace(
                /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(\w+)\s*:|,\s*(?=})/g,
                (token: string, key: string | undefined) => {
                    if (key) {
                        return `"${key}":`;
                    }
                    if (token.startsWith("'")) {
                        const inner = token.slice(1, -1).replace(/(\\.)|"/g, (_part, escaped: string | undefined) => {
                            return escaped ? (escaped === "\\'" ? "'" : escaped) : '\\"';
                        });

                        return JSON.stringify(JSON.parse(`"${inner}"`));
                    }
                    if (token.startsWith(',')) {
                        return '';
                    }

                    return token;
                },
            );
            result.meta = JSON.parse(jsonString) as Record<string, unknown>;

            for (const field of ['layout', 'navLabel']) {
                if (Object.hasOwn(result.meta, field) && typeof result.meta[field] !== 'string') {
                    throw new Error(`Sitemap metadata ${field} must be a string`);
                }
            }
        } catch (error) {
            throw new Error(`Invalid sitemap metadata in line: ${line}`, { cause: error });
        }
    }
    return result;
}

export function buildFullUrl(parentUrl: string, currentUrl: string): string {
    if (currentUrl.startsWith('/')) {
        return currentUrl;
    }
    const cleanParent = parentUrl.replace(/\/$/, '');
    return `${cleanParent}/${currentUrl}`;
}

export function parseIndentedSitemap(content: string): unknown[] {
    const lines = content.split('\n');
    const result: unknown[] = [];
    const stack: Array<{ level: number; children: unknown[] }> = [
        { level: -1, children: result },
    ];

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }
        if (/^sitemap:\s*(?:\[\s*\]\s*)?(?:#.*)?$/.test(trimmed)) {
            return;
        }

        const match = line.match(/^(\s*)-\s*(.*)$/);
        if (!match || !match[2]!.trim()) {
            throw new Error(`Invalid sitemap entry at line ${i + 1}: ${line}`);
        }

        const indent = match[1]!.length;
        const level = Math.floor(indent / 2);
        const itemContent = match[2]!.trim();

        while (stack.length > 1 && stack[stack.length - 1]!.level >= level) {
            stack.pop();
        }
        const parent = stack[stack.length - 1]!;

        // Look ahead for children (next non-empty, non-comment, non-`sitemap:` line).
        let hasChildren = false;
        for (let j = i + 1; j < lines.length; j += 1) {
            const nextLine = lines[j]!;
            const nextTrimmed = nextLine.trim();
            if (!nextTrimmed || nextTrimmed.startsWith('#')) {
                continue;
            }
            if (/^sitemap:\s*(?:\[\s*\]\s*)?(?:#.*)?$/.test(nextTrimmed)) {
                continue;
            }
            const nextMatch = nextLine.match(/^(\s*)-\s*(.+)$/);
            if (nextMatch) {
                const nextIndent = nextMatch[1]!.length;
                hasChildren = Math.floor(nextIndent / 2) > level;
            }
            break;
        }

        if (hasChildren) {
            const obj: Record<string, unknown[]> = {};
            obj[itemContent] = [];
            parent.children.push(obj);
            stack.push({ level, children: obj[itemContent]! });
        } else {
            parent.children.push(itemContent);
        }
    });

    return result;
}

export function processSitemap(items: unknown[], rootTitleFallback = 'Site'): SitemapArtifact {
    const sitemap: unknown[] = [];
    const pages: Record<string, SitemapPage> = Object.create(null);
    const crossOnly = new Set<string>();

    function pushPageData(parsed: ParsedLine, fullUrl: string, crossSection = false): void {
        const urlParts = fullUrl.split('/').filter((p) => p);
        const section: string | null = urlParts.length > 0 ? (urlParts[0] ?? null) : null;
        const breadcrumbs = urlParts.slice(0, -1).map((_, idx) =>
            `/${urlParts.slice(0, idx + 1).join('/')}`,
        );
        // Don't clobber the canonical record of a cross-section link (it was
        // defined in its home section first). A non-cross-section entry (a page
        // defined under its own section) DOES overwrite — so the last definition
        // in its home section wins for the menu name. 1:1 with build-sitemap.js
        // :326-328 (cross-section early-return) vs :348 (non-cross overwrite).
        if (crossSection && pages[fullUrl]) {
            return;
        }
        const existing = pages[fullUrl];
        // Two home-section entries for one URL with different files would drop a page silently.
        if (!crossSection && existing && !crossOnly.has(fullUrl) && existing.file !== parsed.file) {
            throw new Error(`nuckty: sitemap — URL "${fullUrl}" is defined for both "${existing.file}" and "${parsed.file}"`);
        }
        if (crossSection) {
            crossOnly.add(fullUrl);
        }
        else {
            crossOnly.delete(fullUrl);
        }
        const pageData: SitemapPage = {
            file: parsed.file,
            url: fullUrl,
            name: parsed.title,
            title: parsed.title,
            section,
            breadcrumbs,
        };
        // Optional layout from meta.
        if (typeof parsed.meta['layout'] === 'string') {
            pageData.layout = parsed.meta['layout'];
        }
        pages[fullUrl] = pageData;
    }

    /** Cross-section link: absolute URL pointing outside its parent section. */
    function isCrossSection(fullUrl: string, parentUrl: string): boolean {
        if (!parentUrl) {
            return false;
        }
        const cleanParent = parentUrl.replace(/\/$/, '');
        return !fullUrl.startsWith(`${cleanParent}/`);
    }

    const active = new Set<unknown[]>();

    function processItems(
        navItems: unknown[],
        parentUrlValue: string,
        sitemapArray: unknown[],
    ): void {
        if (active.has(navItems)) {
            throw new Error('Sitemap navigation contains a cycle');
        }
        active.add(navItems);
        for (const item of navItems) {
            if (typeof item === 'string') {
                const parsed = parseSitemapLine(item);
                if (!parsed) {
                    throw new Error(`Invalid sitemap line: ${item}`);
                }
                const fullUrl = buildFullUrl(parentUrlValue, parsed.url);
                // Cross-section leaf with navLabel: store as `{ [url]: label }`
                // so the menu renderer can show the alternative label instead
                // of the canonical page name. 1:1 with build-sitemap.js:318-322.
                const crossSection = isCrossSection(fullUrl, parentUrlValue);
                if (crossSection && typeof parsed.meta['navLabel'] === 'string') {
                    const entry: Record<string, string> = {};
                    entry[fullUrl] = parsed.meta['navLabel'] as string;
                    sitemapArray.push(entry);
                } else {
                    sitemapArray.push(fullUrl);
                }
                pushPageData(parsed, fullUrl, crossSection);
            } else if (item !== null && typeof item === 'object') {
                const keys = Object.keys(item as Record<string, unknown>);
                const title = keys[0];
                if (!title) {
                    continue;
                }
                const value = (item as Record<string, unknown>)[title];
                const parsed = parseSitemapLine(title);
                if (!parsed) {
                    throw new Error(`Invalid sitemap line: ${title}`);
                }
                const fullUrl = buildFullUrl(parentUrlValue, parsed.url);

                if (Array.isArray(value) && value.length > 0) {
                    const childrenArray: unknown[] = [];
                    const sitemapEntry: Record<string, unknown[]> = {};
                    sitemapEntry[fullUrl] = childrenArray;
                    sitemapArray.push(sitemapEntry);
                    pushPageData(parsed, fullUrl);
                    processItems(value, fullUrl, childrenArray);
                } else {
                    const crossSection = isCrossSection(fullUrl, parentUrlValue);
                    if (crossSection && typeof parsed.meta['navLabel'] === 'string') {
                        const entry: Record<string, string> = {};
                        entry[fullUrl] = parsed.meta['navLabel'] as string;
                        sitemapArray.push(entry);
                    } else {
                        sitemapArray.push(fullUrl);
                    }
                    pushPageData(parsed, fullUrl, crossSection);
                }
            }
        }
        active.delete(navItems);
    }

    processItems(items, '', sitemap);

    // Root title suffix (mirrors build-sitemap.js title generation).
    const rootPage = pages['/'];
    const rootTitle = rootPage ? rootPage.name : rootTitleFallback;

    // Per-page title: `name | breadcrumb | rootTitle`. A site-specific segment
    // (e.g. a live password on `/common/password`) is a consumer concern and is
    // prepended by a pipeline-extension's `after('sitemap')` hook (openspec
    // `core`: the engine ships no site-specific logic).
    for (const pageUrl of Object.keys(pages)) {
        const pageData = pages[pageUrl];
        if (!pageData) {
            continue;
        }
        const titleParts: string[] = [pageData.name];

        if (pageData.breadcrumbs.length > 0) {
            for (const breadcrumbUrl of pageData.breadcrumbs.slice().reverse()) {
                const breadcrumbPage = pages[breadcrumbUrl];
                if (breadcrumbPage) {
                    titleParts.push(breadcrumbPage.name);
                }
            }
        }

        if (pageUrl !== '/') {
            titleParts.push(rootTitle);
        }

        pages[pageUrl] = { ...pageData, title: titleParts.join(' | ') };
    }

    // md2url / md2urls / url2md maps.
    const md2url: Record<string, string> = Object.create(null);
    const md2urls: Record<string, string[]> = Object.create(null);
    const url2md: Record<string, string> = Object.create(null);
    for (const [url, pageData] of Object.entries(pages)) {
        const filePath = pageData.file;
        if (filePath && url) {
            md2url[filePath] = url;
            if (!md2urls[filePath]) {
                md2urls[filePath] = [];
            }
            md2urls[filePath]!.push(url);
            url2md[url] = filePath;
        }
    }

    return { sitemap, pages, md2url, md2urls, url2md };
}

/**
 * Sitemap stage. Reads sitemap.yml from ctx.configDir, parses the navigation
 * structure, renders each page's markdown into a BemNode tree, and stores the
 * sitemap artifact in `ctx.store.sitemap`.
 */
export const sitemapStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    try {
        // sitemap.yml comes from the TARGET's configDir (RUNTIME-005),
        // not the project root's config/ — two targets may differ.
        const sitemapPath = path.join(ctx.configDir, 'sitemap.yml');
        const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
        const navigation = parseIndentedSitemap(sitemapContent);
        const config = getBuildConfig(ctx);
        const result = processSitemap(navigation, config.site.rootTitle);

        const contentDir = config.contentDir;
        const relativePrefix = config.contentRelative;

        // Render each page's markdown into a BemNode tree.
        const entries = Object.entries(result.pages);
        const realContentDir = entries.some(([, page]) => page.file)
            ? await fs.realpath(contentDir)
            : contentDir;
        const timestampCache = new Map<string, Promise<number | null>>();
        const renderPage = async ([url, pageData]: [string, SitemapPage]): Promise<void> => {
            const filePath = pageData.file;
            if (!filePath) {
                return;
            }
            const fullPath = path.resolve(contentDir, filePath);
            const relativeFile = path.relative(contentDir, fullPath);
            if (relativeFile === '..' || relativeFile.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFile)) {
                throw new Error(`Sitemap source escapes content directory: ${filePath}`);
            }
            const realPath = await fs.realpath(fullPath);
            const realRelative = path.relative(realContentDir, realPath);

            if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
                throw new Error(`Sitemap source escapes content directory: ${filePath}`);
            }
            const content = await fs.readFile(realPath, 'utf8');
            const relativePath = path.relative(contentDir, fullPath);
            const mdOpts: MarkdownOptions = {
                md2url: result.md2url,
                md2urls: result.md2urls,
                currentUrl: url,
                sourceFile: filePath,
                baseUrl: config.site.baseUrl,
                slugify: { case: 'lower' },
                inputPath: `${relativePrefix}${relativePath}`,
                githubRawBase: config.site.githubRawBase,
            };
            const imageMapping = ctx.store['imageMapping'] as Record<string, string> | undefined;
            if (imageMapping) {
                mdOpts.imageMapping = imageMapping;
            }
            const downloads = ctx.store['downloads'] as Record<string, string> | undefined;
            if (downloads) {
                mdOpts.downloads = downloads;
            }
            // Pass extension-registered remark plugins (env.markdown.use) and
            // generic-directive mappings (env.markdown.directive) into the bridge.
            const remarkPlugins = ctx.env.markdown.list();
            if (remarkPlugins.length > 0) {
                mdOpts.remarkPlugins = remarkPlugins as MarkdownOptions['remarkPlugins'];
            }
            const directives = ctx.env.markdown.directiveMappings();
            if (directives.size > 0) {
                mdOpts.directiveMappings = directives;
            }
            const renderer = createMarkdown(mdOpts);
            const { tree, headings } = renderer.render(content);
            const updated: SitemapPage = {
                ...pageData,
                tree,
                headings,
                inputPath: `${relativePrefix}${relativePath}`,
                lastUpdated: await getFileTimestamp(realPath, timestampCache),
            };
            result.pages[url] = updated;
        };

        // Bound Markdown trees, reads and Git children in flight. Settle workers
        // before reporting failure so callers can safely clean up their fixture.
        let nextEntry = 0;
        let failed = false;
        const workers = Array.from({ length: Math.min(8, entries.length) }, async () => {
            while (!failed && nextEntry < entries.length) {
                const entry = entries[nextEntry++]!;
                try {
                    await renderPage(entry);
                } catch (error) {
                    failed = true;
                    throw error;
                }
            }
        });
        const results = await Promise.allSettled(workers);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') {
            throw failure.reason;
        }

        // Cross-document + same-document anchor resolution. After every page is
        // parsed (so all headings are known), build a githubSlug → hierarchicalAnchor
        // map per page and rewrite `#anchor`/`<url>#anchor` link hrefs against the
        // target page's map (1:1 with markdown.js transformAnchorLink). Forward
        // references work because the whole file is parsed up front.
        const anchorMaps = new Map<string, Map<string, string>>();
        for (const [u, p] of Object.entries(result.pages)) {
            anchorMaps.set(u, buildAnchorMap(p.headings));
        }
        for (const p of Object.values(result.pages)) {
            resolvePageAnchors(p, result, anchorMaps);
        }

        // Persist the navigation artifact for build diagnostics.
        await fs.mkdir(ctx.buildDir, { recursive: true });
        await fs.writeFile(
            await resolveBuildFile(ctx.buildDir, 'sitemap.json'),
            JSON.stringify(result, null, 4),
            'utf8',
        );

        ctx.store['sitemap'] = result;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Sitemap generation failed: ${msg}`);
    }
};

