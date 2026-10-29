import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { bundle as lightningBundle, transform as lightningTransform } from 'lightningcss';
import type { Image, Url } from 'lightningcss';
import { assertArtifactPath, resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { generateHash } from '../utils/hash.js';
import { getBuildConfig } from '../utils/build-config.js';
import type { BundleHashEntry } from './types.js';

/** Resolve the absolute path to a block's CSS file (block or element form). */
function blockCssPath(sourcePath: string, block: string): string {
    const parts = block.split('__');
    const blockName = parts[0]!;
    const elementName = parts[1];
    if (elementName) {
        return path.join(sourcePath, blockName, `__${elementName}`, `${block}.css`);
    }
    return path.join(sourcePath, block, `${block}.css`);
}

interface CssUrlToken {
    value: string;
    start: number;
    end: number;
}

/** Parse real URL values, then edit their source spans to retain unrelated CSS. */
function cssUrlTokens(css: string): CssUrlToken[] {
    const lineStarts = [0];
    for (const match of css.matchAll(/\r\n|[\n\r\f]/g)) {
        lineStarts.push(match.index + match[0].length);
    }
    const tokens = new Map<number, CssUrlToken>();
    const collect = (url: Url): void => {
        const start = lineStarts[url.loc.line - 1]! + url.loc.column - 1;
        const stringToken = css[start] === '"' || css[start] === "'";
        let quote = stringToken ? css[start] : undefined;
        const first = stringToken ? start + 1 : css.indexOf('(', start) + 1;

        for (let index = first; index < css.length; index += 1) {
            const character = css[index];
            if (character === '\\') {
                index += 1;
            } else if (quote) {
                if (character === quote) {
                    if (stringToken) {
                        tokens.set(start, { value: url.url, start, end: index + 1 });

                        return;
                    }
                    quote = undefined;
                }
            } else if (character === '"' || character === "'") {
                quote = character;
            } else if (character === ')') {
                tokens.set(start, { value: url.url, start, end: index + 1 });

                return;
            }
        }
    };
    const collectImage = (image: Image): void => {
        if (image.type === 'url') {
            collect(image.value);
        } else if (image.type === 'image-set') {
            for (const option of image.value.options) {
                collectImage(option.image);
            }
        }
    };

    lightningTransform({ filename: 'image-references.css', code: Buffer.from(css), visitor: { Url: collect, Image: collectImage } });

    return [...tokens.values()].sort((left, right) => right.start - left.start);
}

function rewriteCssUrls(css: string, tokens: CssUrlToken[], replacement: (value: string) => string | undefined): string {
    let result = css;
    for (const token of tokens) {
        const value = replacement(token.value);
        if (value !== undefined) {
            result = result.slice(0, token.start) + value + result.slice(token.end);
        }
    }

    return result;
}

function cssUrl(value: string): string {
    if (!/[\s"'()\\]/.test(value)) {
        return `url(${value})`;
    }
    const escaped = value.replace(/["\\\n\r\f]/g, character => character === '"' || character === '\\'
        ? `\\${character}`
        : `\\${character.charCodeAt(0).toString(16)} `);

    return `url("${escaped}")`;
}

export async function processImageReferences(css: string, imageMapping: Record<string, string>): Promise<string> {
    return rewriteCssUrls(css, cssUrlTokens(css), authored => {
        const original = authored.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '').replace(/[\t\n\r]/g, '');
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(original)) {
            return undefined;
        }
        const suffixIndex = original.search(/[?#]/);
        const suffix = suffixIndex < 0 ? '' : original.slice(suffixIndex);
        let imagePath = suffixIndex < 0 ? original : original.slice(0, suffixIndex);
        try {
            imagePath = decodeURIComponent(imagePath);
        } catch {
            return undefined;
        }
        if (!/\.(?:png|jpg|jpeg|gif|svg|webp)$/i.test(imagePath)) {
            return undefined;
        }
        const normalized = path.posix.normalize(imagePath).replace(/^(?:\.\.\/)+/, '').replace(/^\//, '');
        let hashedFilename = Object.hasOwn(imageMapping, normalized) ? imageMapping[normalized] : undefined;
        if (hashedFilename === undefined && !normalized.includes('/')) {
            const matches = Object.entries(imageMapping).filter(([relativePath]) => path.posix.basename(relativePath) === normalized);
            if (matches.length > 1) {
                throw new Error(`Ambiguous image reference "${imagePath}": ${matches.map(([key]) => key).join(', ')}`);
            }
            hashedFilename = matches[0]?.[1];
        }
        if (hashedFilename === undefined) {
            return undefined;
        }
        // The images stage maps raster images to negotiated `_i<hash>` URLs and SVGs to `<hash>.svg`.
        return cssUrl(`/${hashedFilename}${suffix}`);
    });
}

export async function inlineHashedSVGs(css: string, siteDir: string): Promise<string> {
    const tokens = cssUrlTokens(css);
    const uniqueSvgFiles = new Set(tokens.map(token => token.value).filter(value => /^\/[a-f0-9]{16}\.svg$/.test(value)).map(value => value.slice(1)));
    const processed = new Map<string, string>();
    for (const hashedFilename of uniqueSvgFiles) {
        if (processed.has(hashedFilename)) continue;
        try {
            const svgPath = path.join(siteDir, 'svg', hashedFilename);
            const svgContent = await fs.readFile(svgPath, 'utf8');
            const dataUri = `data:image/svg+xml,${encodeURIComponent(svgContent).replace(/'/g, '%27')}`;
            processed.set(hashedFilename, dataUri);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT' && process.env.NODE_ENV !== 'test') {
                console.warn(`Warning: Could not inline hashed SVG ${hashedFilename}: ${(error as Error).message}`);
            }
        }
    }
    return rewriteCssUrls(css, tokens, value => {
        const dataUri = processed.get(value.slice(1));

        return dataUri === undefined ? undefined : `url('${dataUri}')`;
    });
}

/**
 * Build a single CSS bundle and return its hash entry. Mirrors `CSSBuilder.build()`.
 */
async function buildBundle(
    bundle: string,
    root: string,
    buildDir: string,
    siteDir: string,
    imageMapping: Record<string, string>,
    bemdecl: string[],
    levels: string[],
): Promise<BundleHashEntry | null> {
    const sourcePaths = levels.map((level) => path.resolve(root, level));
    if (bemdecl.length === 0) return null;

    // 1. Generate @import list.
    let cssImports = '';
    const sourceFiles: string[] = [];
    for (const block of bemdecl) {
        let hasImports = false;
        for (const sourcePath of sourcePaths) {
            const blockPath = blockCssPath(sourcePath, block);
            try {
                await fs.access(blockPath);
                const importPath = blockPath.replace(/["\\\n\r\f]/g, (character) => {
                    return character === '"' || character === '\\'
                        ? `\\${character}`
                        : `\\${character.charCodeAt(0).toString(16)} `;
                });
                cssImports += `@import "${importPath}";\n`;
                sourceFiles.push(blockPath);
                hasImports = true;
            } catch {
                // skip missing
            }
        }
        if (hasImports) cssImports += '\n';
    }
    const mainCssPath = await resolveBuildFile(buildDir, `${bundle}.css`);
    await fs.writeFile(mainCssPath, cssImports);

    // 2. Lightning CSS: inline @import, apply vendor prefixes (targets), minify
    //    — one pass replacing PostCSS (postcss-import + autoprefixer) + CSSO.
    //    Lightning CSS packs browser versions as major << 16 | minor << 8 | patch.
    const bundled = lightningBundle({
        filename: mainCssPath,
        minify: true,
        sourceMap: false,
        targets: {
            android: 110 << 16,
            chrome: 110 << 16,
            edge: 110 << 16,
            firefox: 79 << 16,
            ios_saf: 16 << 16,
            safari: 16 << 16,
            samsung: 20 << 16,
            opera: 100 << 16,
        },
        errorRecovery: false,
    });
    let css = new TextDecoder('utf8').decode(bundled.code);

    // 3. Rewrite parsed URL source spans and inline hashed SVG resources.
    css = await processImageReferences(css, imageMapping);
    css = await inlineHashedSVGs(css, siteDir);

    const hash = generateHash(css);
    const hashedFilename = `${hash}.css`;

    const buildHashPath = await resolveBuildFile(buildDir, 'hash-css.json');
    let allHashes: Record<string, BundleHashEntry> = Object.create(null);
    try {
        const existing = await fs.readFile(buildHashPath, 'utf8');
        if (existing.trim()) allHashes = JSON.parse(existing) as Record<string, BundleHashEntry>;
    } catch {
        // start fresh
    }
    const entry: BundleHashEntry = {
        hash,
        filename: hashedFilename,
        url: `/${hash}.css`,
        source: sourceFiles.map((file) => path.relative(root, file)),
    };
    Object.defineProperty(allHashes, bundle, { value: entry, enumerable: true, configurable: true });
    await fs.writeFile(buildHashPath, JSON.stringify(allHashes, null, 2));

    const cssDir = path.join(siteDir, 'css');
    await assertArtifactPath(siteDir, path.join(cssDir, hashedFilename));
    await fs.mkdir(cssDir, { recursive: true });
    await fs.writeFile(path.join(cssDir, hashedFilename), css);

    return entry;
}

/**
 * CSS stage. Builds every configured bundle and stores the per-bundle hash map
 * in `ctx.store.cssHash`.
 */
export const cssStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const root = ctx.cwd;
    await fs.mkdir(ctx.buildDir, { recursive: true });
    await assertArtifactPath(ctx.outDir);
    await fs.mkdir(ctx.outDir, { recursive: true });

    const bundles = getBuildConfig(ctx).site.bundles;
    const imageMapping = (ctx.store['imageMapping'] as Record<string, string> | undefined) ?? {};
    const blockDeps = (ctx.store['blockDeps'] as Record<string, string[]> | undefined) ?? {};
    const registeredLevels = ctx.env.levels.list();
    const levels = registeredLevels.length > 0 ? registeredLevels : getBuildConfig(ctx).levels;

    const cssHash: Record<string, BundleHashEntry> = Object.create(null);
    for (const bundle of bundles) {
        const entry = await buildBundle(
            bundle,
            root,
            ctx.buildDir,
            ctx.outDir,
            imageMapping,
            (Object.hasOwn(blockDeps, bundle) ? blockDeps[bundle] : undefined) ?? [],
            levels,
        );
        if (entry) cssHash[bundle] = entry;
    }

    ctx.store['cssHash'] = cssHash;
};

