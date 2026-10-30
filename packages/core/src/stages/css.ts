import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { bundle as lightningBundle, transform as lightningTransform } from 'lightningcss';
import type { Image, Url } from 'lightningcss';
import { assertArtifactPath, resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { blockFiles, bundleInputs, writeBundle } from './bundle.js';
import type { BundleHashEntry } from './types.js';

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
        if (processed.has(hashedFilename)) {
            continue;
        }
        try {
            const svgPath = path.join(siteDir, 'svg', hashedFilename);
            const svgContent = await fs.readFile(svgPath, 'utf8');
            const dataUri = `data:image/svg+xml,${encodeURIComponent(svgContent).replace(/'/g, '%27')}`;
            processed.set(hashedFilename, dataUri);
        } catch (error) {
            // A reference to an SVG the build did not produce stays a URL; other read errors fail the build.
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }
    return rewriteCssUrls(css, tokens, value => {
        const dataUri = processed.get(value.slice(1));

        return dataUri === undefined ? undefined : `url('${dataUri}')`;
    });
}

/** Lightning CSS packs browser versions as major << 16 | minor << 8 | patch. */
const BROWSER_TARGETS = {
    android: 110 << 16,
    chrome: 110 << 16,
    edge: 110 << 16,
    firefox: 79 << 16,
    ios_saf: 16 << 16,
    safari: 16 << 16,
    samsung: 20 << 16,
    opera: 100 << 16,
};

/** Build one CSS bundle from the declared blocks' files, or return null when there are none. */
async function buildBundle(ctx: BuildContext, bundle: string, files: string[], imageMapping: Record<string, string>): Promise<BundleHashEntry | null> {
    if (files.length === 0) {
        return null;
    }
    const imports = files.map((file) => `@import "${file.replace(/["\\\n\r\f]/g, (character) => (character === '"' || character === '\\'
        ? `\\${character}`
        : `\\${character.charCodeAt(0).toString(16)} `))}";\n`).join('');
    const entry = await resolveBuildFile(ctx.buildDir, `${bundle}.css`);
    await fs.writeFile(entry, imports);

    // Inline imports, add vendor prefixes for the targets and minify in one pass.
    const bundled = lightningBundle({ filename: entry, minify: true, sourceMap: false, targets: BROWSER_TARGETS, errorRecovery: false });
    let css = new TextDecoder('utf8').decode(bundled.code);

    css = await processImageReferences(css, imageMapping);
    css = await inlineHashedSVGs(css, ctx.outDir);

    return writeBundle(ctx.outDir, ctx.cwd, 'css', css, files);
}

/** CSS stage. Builds every configured bundle and stores the per-bundle hash map in `ctx.store.cssHash`. */
export const cssStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await fs.mkdir(ctx.buildDir, { recursive: true });
    await assertArtifactPath(ctx.outDir);
    await fs.mkdir(ctx.outDir, { recursive: true });

    const { bundles, levels, entities } = bundleInputs(ctx);
    const imageMapping = (ctx.store['imageMapping'] as Record<string, string> | undefined) ?? {};
    const cssHash: Record<string, BundleHashEntry> = Object.create(null);

    for (const bundle of bundles) {
        const entry = await buildBundle(ctx, bundle, await blockFiles(ctx.cwd, levels, entities(bundle), 'css'), imageMapping);

        if (entry) {
            cssHash[bundle] = entry;
        }
    }

    ctx.store['cssHash'] = cssHash;
};
