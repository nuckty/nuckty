/**
 * remark/unified Markdown bridge. It turns mdast into `article` BEM entities
 * whose data lives in `props`; the default Markdown templates and the site's
 * own templates decide the HTML. Only HTML written in the Markdown source stays
 * raw. Extensions map directives and other mdast node types to BEMJSON.
 */

import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import type {
    Root,
    Heading,
    List,
    Code,
    Table,
    TableRow,
    PhrasingContent,
    Image,
    Definition,
} from 'mdast';
import { toString } from 'mdast-util-to-string';
import { buildHierarchicalAnchor } from './anchors.js';
import { transformImagePathShared } from './image-mapping.js';
import { postprocessHtml } from './html-postprocess.js';
import { isDownload } from '../utils/downloads.js';
import type { BemNode, BEMTree } from '../bem/types.js';
import type { DirectiveConverters, DirectiveHandler, DirectiveNode, MarkdownNode, MarkdownNodeHandler } from '../env/env.js';

export interface MarkdownOptions {
    /** Map of original image paths → hashed filenames (built by the images stage). */
    imageMapping?: Record<string, string>;
    /** Resolved md path → page URL map, for relative `.md` link resolution. */
    md2url?: Record<string, string>;
    /** Resolved md path → array of candidate page URLs (when multiple .md share a path). */
    md2urls?: Record<string, string[]>;
    /** Current page URL, used to resolve relative links and anchors. */
    currentUrl?: string;
    /** Language of the target, available to directive and node handlers. */
    lang?: string;
    /** Site origin used to keep rewritten raw-asset URLs absolute in copied code. */
    baseUrl?: string;
    /** Slugify options for heading anchors. */
    slugify?: Parameters<typeof buildHierarchicalAnchor>[1];
    /** Current Markdown file relative to the content root, for links and images. */
    sourceFile?: string;
    /** Source path relative to the consumer root: resolves links, images and downloads when `sourceFile` is absent, and names the page in errors. */
    inputPath?: string;
    /** Published download filename → source path relative to the consumer root (built by the assets stage). */
    downloads?: Record<string, string>;
    /** Remark plugins registered through `env.markdown.use`, applied after the core parse. */
    remarkPlugins?: Array<import('unified').Plugin<[], Root>> | undefined;
    /** Directive handlers registered through `env.markdown.directive`; an unmapped directive falls back to its content. */
    directiveMappings?: Map<string, DirectiveHandler> | undefined;
    /** mdast node handlers registered through `env.markdown.node`; they run before the core conversion of that type. */
    nodeMappings?: Map<string, MarkdownNodeHandler> | undefined;
    /**
     * Literal URL prefixes of raw GitHub files rewritten to site-root paths
     * (`<base><file>` → `/<file>`), from `config/site.json` `githubRawBase`.
     */
    githubRawBase?: string | string[] | null | undefined;
}

export interface MarkdownResult {
    /** The article content as a BemNode tree. */
    tree: BEMTree;
    /** Headings collected during render, in document order. */
    headings: Array<{ level: number; text: string; rawText: string; anchor: string }>;
}

interface BridgeEnv {
    options: Readonly<MarkdownOptions>;
    definitions: Map<string, Definition>;
    headingStack: string[];
    generatedIds: Set<string>;
    headings: MarkdownResult['headings'];
    imageMapping: Record<string, string>;
    md2url: Record<string, string>;
    md2urls: Record<string, string[]>;
    currentUrl: string;
    baseUrl?: string | undefined;
    slugifyOpts: Parameters<typeof buildHierarchicalAnchor>[1];
    sourceFile?: string | undefined;
    inputPath?: string | undefined;
    downloads?: Record<string, string> | undefined;
    githubRawBase?: string | string[] | null | undefined;
}

/** Create a Markdown renderer that emits BemNode trees. */
export function createMarkdown(opts: MarkdownOptions = {}): { render: (src: string) => MarkdownResult } {
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(opts.remarkPlugins ?? []);

    const render = (src: string): MarkdownResult => {
        const tree = processor.runSync(processor.parse(normalizeContainerFences(src))) as Root;
        const env: BridgeEnv = {
            options: opts,
            definitions: collectDefinitions(tree),
            headingStack: [],
            generatedIds: new Set(),
            headings: [],
            imageMapping: opts.imageMapping ?? {},
            md2url: opts.md2url ?? {},
            md2urls: opts.md2urls ?? {},
            currentUrl: opts.currentUrl ?? '',
            baseUrl: opts.baseUrl,
            slugifyOpts: opts.slugify ?? {},
            sourceFile: opts.sourceFile,
            inputPath: opts.inputPath,
            downloads: opts.downloads,
            githubRawBase: opts.githubRawBase,
        };

        return { tree: blocksToBem(tree.children, env, false), headings: env.headings };
    };

    return { render };
}

/** An `article` element node. */
function md(elem: string, content?: BEMTree, props?: Record<string, unknown>, elemMods?: BemNode['elemMods']): BemNode {
    return {
        block: 'article',
        elem,
        ...(elemMods ? { elemMods } : {}),
        ...(content === undefined ? {} : { content }),
        ...(props ? { props } : {}),
    };
}

// ---- block nodes → BemNode --------------------------------------------------

function blocksToBem(
    children: Root['children'],
    env: BridgeEnv,
    insideListItem: 'tight' | 'loose' | false,
): BEMTree[] {
    const out: BEMTree[] = [];
    for (const node of children) {
        const handled = invokeNodeHandler(node, env);

        if (handled !== undefined) {
            out.push(handled);
            continue;
        }
        switch (node.type) {
            case 'heading': {
                out.push(headingToBem(node, env));
                break;
            }
            case 'paragraph': {
                const content = phrasingToBem(node.children, env);
                if (insideListItem === 'tight') {
                    out.push(...content);
                } else {
                    out.push(md('paragraph', content));
                }
                break;
            }
            case 'list': {
                out.push(listToBem(node, env));
                break;
            }
            case 'code': {
                out.push(codeToBem(node, env));
                break;
            }
            case 'thematicBreak': {
                out.push(md('rule'));
                break;
            }
            case 'blockquote': {
                out.push(md('blockquote', blocksToBem(node.children, env, false)));
                break;
            }
            case 'table': {
                out.push(tableToBem(node, env));
                break;
            }
            case 'html': {
                out.push(rawHtml(node.value, env));
                break;
            }
            case 'containerDirective': {
                const rendered = invokeDirective(node, 'containerDirective', env);
                if (rendered !== null) {
                    out.push(rendered);
                } else {
                    out.push(...blocksToBem(node.children, env, false));
                }
                break;
            }
            case 'leafDirective': {
                const rendered = invokeDirective(node, 'leafDirective', env);
                if (rendered !== null) {
                    out.push(rendered);
                } else if (node.children.length > 0) {
                    // The label is phrasing content: render it as the paragraph it stands in for.
                    out.push(...blocksToBem([{ type: 'paragraph', children: node.children }], env, insideListItem));
                }
                break;
            }
            case 'footnoteDefinition': {
                out.push(md('footnote', blocksToBem(node.children, env, false), { id: `fn-${node.identifier}` }));
                break;
            }
            default:
                break;
        }
    }
    return out;
}

/** Authored HTML stays raw; logical image paths inside it go through the image mapping. */
function rawHtml(value: string, env: BridgeEnv): BemNode {
    return { raw: postprocessHtml(value, env) };
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'listItem', 'blockquote', 'code', 'table', 'thematicBreak', 'containerDirective', 'leafDirective', 'footnoteDefinition', 'definition']);
const converters = new WeakMap<BridgeEnv, DirectiveConverters>();

/** Converters handed to directive and node handlers, created once per bridge env. */
function directiveConverters(env: BridgeEnv): DirectiveConverters {
    let convert = converters.get(env);
    if (!convert) {
        convert = {
            inline: (children) => {
                const block = (children as Array<{ type?: string }>).find((child) => BLOCK_TYPES.has(child.type ?? ''));
                if (block) {
                    throw new Error(`convert.inline received block node ${block.type}; use convert.blocks`);
                }
                return phrasingToBem(children as PhrasingContent[], env);
            },
            blocks: (children) => blocksToBem(children as Root['children'], env, false),
        };
        converters.set(env, convert);
    }
    return convert;
}

/**
 * Run a handler that may decline with null. A declining handler may already
 * have converted children; restore the page's heading and id state so the
 * fallback conversion does not register them twice.
 */
function withRollback(env: BridgeEnv, run: () => BEMTree | null): BEMTree | null {
    const headings = env.headings.length;
    const generatedIds = new Set(env.generatedIds);
    const headingStack = [...env.headingStack];
    const rendered = run();

    if (rendered === null) {
        env.headings.length = headings;
        env.generatedIds = generatedIds;
        env.headingStack.splice(0, env.headingStack.length, ...headingStack);
    }

    return rendered;
}

/** Call the directive handler registered for the directive name, or return null. */
function invokeDirective(
    node: { name: string; children?: unknown[]; attributes?: Record<string, string | null | undefined> | null | undefined },
    type: NonNullable<DirectiveNode['type']>,
    env: BridgeEnv,
): BEMTree | null {
    const handler = env.options.directiveMappings?.get(node.name);

    if (!handler) {
        return null;
    }
    const attributes = Object.fromEntries(Object.entries(node.attributes ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    const directive: DirectiveNode = { type, name: node.name, children: node.children ?? [], attributes };

    return withRollback(env, () => handler(directive, env.options, directiveConverters(env)));
}

/** Result of a node handler for this mdast type; undefined when none is registered or it declines. */
function invokeNodeHandler(node: { type: string }, env: BridgeEnv): BEMTree | undefined {
    const handler = env.options.nodeMappings?.get(node.type);

    if (!handler) {
        return undefined;
    }
    const rendered = withRollback(env, () => handler(node as MarkdownNode, env.options, directiveConverters(env)));

    return rendered === null ? undefined : rendered;
}

function headingToBem(node: Heading, env: BridgeEnv): BemNode {
    const level = node.depth;

    // Keep literal code and markup out of heading metadata detection.
    const rawText = toString(node, { includeHtml: false });
    const headingChildren = node.children.slice();
    const lastIndex = headingChildren.length - 1;
    const last = headingChildren[lastIndex];
    const customAnchor = last?.type === 'text' ? last.value.match(/\{#([^}]+)\}$/)?.[1] ?? null : null;
    const { anchor, cleanText, rawText: headingRaw } = resolveHeading(rawText, level, env, customAnchor);

    if (last?.type === 'text' && customAnchor !== null) {
        headingChildren[lastIndex] = { ...last, value: last.value.replace(/\s*\{#[^}]+\}$/, '') };
    }
    const children = phrasingToBem(headingChildren, env);
    const content = anchor ? wrapHeadingAnchor(children, anchor, cleanText) : children;
    env.headings.push({ level, text: cleanText, rawText: headingRaw, anchor });

    return md('heading', content, anchor ? { id: anchor } : undefined, { level: String(level) });
}

function listToBem(node: List, env: BridgeEnv): BemNode {
    const items = node.children.map((item) => {
        const content: BEMTree[] = blocksToBem(item.children, env, item.spread ? 'loose' : 'tight');

        if (typeof item.checked === 'boolean') {
            content.unshift(md('task', undefined, { checked: item.checked, label: toString(item).trim() }));
        }

        return md('list-item', content);
    });
    const start = node.ordered && typeof node.start === 'number' && node.start !== 1 ? { start: String(node.start) } : undefined;

    return md('list', items, start, node.ordered ? { ordered: true } : undefined);
}

function codeToBem(node: Code, env: BridgeEnv): BemNode {
    const text = node.value === '' ? '' : transformGitHubLinksInText(node.value + '\n', env.githubRawBase, env.baseUrl);

    return md('code', md('code-text', text), node.lang ? { lang: node.lang } : undefined);
}

function tableToBem(node: Table, env: BridgeEnv): BemNode {
    const [head, ...body] = node.children;
    const content: BemNode[] = [];

    if (head) {
        content.push(md('table-head', rowToBem(head, env, true, node.align)));
    }
    if (body.length > 0) {
        content.push(md('table-body', body.map((row) => rowToBem(row, env, false, node.align))));
    }

    return md('table', content);
}

function rowToBem(row: TableRow, env: BridgeEnv, isHeader: boolean, align: Table['align']): BemNode {
    const cells = row.children.map((cell, index) => {
        // remark-gfm keeps U+00A0 at cell edges; `\s` trims it like other whitespace.
        const content = trimCellEdges(phrasingToBem(cell.children, env));
        const alignment = align?.[index];

        return md('table-cell', content, alignment ? { align: alignment } : undefined, isHeader ? { header: true } : undefined);
    });

    return md('table-row', cells);
}

/** Trim whitespace from the boundary strings of a table cell. */
function trimCellEdges(children: BEMTree[]): BEMTree[] {
    const out = children.slice();
    // leading edge
    for (let i = 0; i < out.length; i++) {
        const v = out[i];
        if (typeof v === 'string') {
            const trimmed = v.replace(/^\s+/, '');
            if (trimmed === '' && v !== '') { out.splice(i, 1); i--; continue; }
            out[i] = trimmed;
            break;
        }
        break;
    }
    // trailing edge
    for (let i = out.length - 1; i >= 0; i--) {
        const v = out[i];
        if (typeof v === 'string') {
            const trimmed = v.replace(/\s+$/, '');
            if (trimmed === '' && v !== '') { out.splice(i, 1); continue; }
            out[i] = trimmed;
            break;
        }
        break;
    }
    return out;
}

// ---- phrasing (inline) nodes → BemNode/text --------------------------------

function phrasingToBem(children: PhrasingContent[], env: BridgeEnv): BEMTree[] {
    const out: BEMTree[] = [];
    for (const node of children) {
        const handled = invokeNodeHandler(node, env);

        if (handled !== undefined) {
            out.push(handled);
            continue;
        }
        switch (node.type) {
            case 'text': {
                out.push(node.value);
                break;
            }
            case 'inlineCode': {
                out.push(md('inline-code', transformGitHubLinksInText(node.value, env.githubRawBase, env.baseUrl)));
                break;
            }
            case 'break': {
                out.push(md('break'));
                break;
            }
            case 'image': {
                out.push(imageToBem(node, env));
                break;
            }
            case 'link': {
                out.push(linkToBem(resolveLink(node.url, env), node.title, phrasingToBem(node.children, env)));
                break;
            }
            case 'linkReference': {
                const definition = env.definitions.get(node.identifier.toUpperCase());
                if (definition) {
                    out.push(linkToBem(resolveLink(definition.url, env), definition.title, phrasingToBem(node.children, env)));
                } else {
                    out.push(...phrasingToBem(node.children, env));
                }
                break;
            }
            case 'imageReference': {
                const definition = env.definitions.get(node.identifier.toUpperCase());
                if (definition) {
                    out.push(imageToBem({ type: 'image', url: definition.url, alt: node.alt, title: definition.title }, env));
                } else {
                    out.push(node.alt ?? '');
                }
                break;
            }
            case 'delete': {
                out.push(md('delete', phrasingToBem(node.children, env)));
                break;
            }
            case 'footnoteReference': {
                out.push(md('footnote-ref', md('footnote-link', node.label ?? node.identifier, { href: `#fn-${node.identifier}` })));
                break;
            }
            case 'strong': {
                out.push(md('strong', phrasingToBem(node.children, env)));
                break;
            }
            case 'emphasis': {
                out.push(md('emphasis', phrasingToBem(node.children, env)));
                break;
            }
            case 'html': {
                out.push(rawHtml(node.value, env));
                break;
            }
            case 'textDirective': {
                const rendered = invokeDirective(node, 'textDirective', env);
                if (rendered !== null) {
                    out.push(rendered);
                } else if (node.children.length > 0) {
                    out.push(...phrasingToBem(node.children, env));
                } else {
                    out.push(`:${node.name}`);
                }
                break;
            }
            default:
                break;
        }
    }
    return out;
}

function linkToBem(href: string, title: string | null | undefined, content: BEMTree[]): BemNode {
    return md('link', content, { href, ...(title ? { title } : {}) });
}

/** An image with its URL rewritten through the image mapping. */
function imageToBem(node: Image, env: BridgeEnv): BemNode {
    return md('image', undefined, {
        src: transformImagePathShared(node.url, env),
        alt: node.alt ?? '',
        ...(node.title ? { title: node.title } : {}),
    });
}

// ---- link/heading resolution ----------------------------------------------

/** Normalize a `githubRawBase` value to a list of literal URL prefixes (or `[]`). */
function rawBases(base: string | string[] | null | undefined): string[] {
    if (!base) {
        return [];
    }

    return (Array.isArray(base) ? base : [base]).filter(prefix => prefix !== '');
}

/** Match a href against the configured bases; return the captured filename or null. */
function matchRawBase(href: string, bases: string[]): string | null {
    for (const base of bases) {
        if (href.startsWith(base) && href.length > base.length) {
            return href.slice(base.length);
        }
    }

    return null;
}

/**
 * Rewrite a GitHub raw asset URL to its site-root `/<file>` form. `base` is the
 * consumer-configured rewrite base (`config/site.json` `githubRawBase`, one or
 * more literal URL prefixes); the rewrite is a no-op when `base` is absent.
 */
function transformAssetLinkPath(href: string, base: string | string[] | null | undefined): string {
    if (!href) {
        return href;
    }
    const filename = matchRawBase(href, rawBases(base));
    return filename !== null ? `/${filename}` : href;
}

function transformGitHubLinksInText(text: string, base: string | string[] | null | undefined, siteBaseUrl?: string): string {
    const bases = rawBases(base);

    if (bases.length === 0 || !siteBaseUrl) {
        return text;
    }

    return text.replace(/[a-z][a-z\d+.-]*:\/\/[^\s"]+/gi, (url: string) => {
        const filename = matchRawBase(url, bases);

        return filename === null ? url : `${siteBaseUrl.replace(/\/+$/, '')}/${filename}`;
    });
}

function resolveLink(href: string, env: BridgeEnv): string {
    if (!href || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('/') || href.startsWith('#')) {
        return transformAssetLinkPath(href, env.githubRawBase);
    }

    const suffixIndex = href.search(/[?#]/);
    const suffix = suffixIndex < 0 ? '' : href.slice(suffixIndex);
    let target = suffixIndex < 0 ? href : href.slice(0, suffixIndex);
    try {
        target = decodeURIComponent(target);
    } catch {
        // Keep malformed URI escapes literal for the diagnostic.
    }
    if (isDownload(target)) {
        return resolveDownload(href, target, suffix, env);
    }
    if (/\.(html|php|asp|jsp)$/i.test(target)) {
        throw new Error(`Unknown relative link type in ${env.inputPath ?? 'unknown file'}: "${href}"`);
    }
    if (!/\.md$/i.test(target) || (!Object.keys(env.md2url).length && !Object.keys(env.md2urls).length)) {
        return href;
    }

    const lookup = (key: string): string | undefined => {
        const candidates = env.md2urls[key] ?? env.md2urls['./' + key];
        return candidates?.length ? findClosestUrl(candidates, env.currentUrl) : env.md2url[key] ?? env.md2url['./' + key];
    };
    const normalized = path.posix.normalize(target.replace(/\\/g, '/'));
    const input = env.sourceFile?.replace(/\\/g, '/') ?? env.inputPath?.replace(/^(?:\.\/)?external\/[^/]+\//, '');
    const relative = input ? path.posix.join(path.posix.dirname(input), normalized) : normalized;
    let mapped = lookup(relative) ?? lookup(normalized);
    if (!mapped && !target.includes('/')) {
        const keys = [...new Set([...Object.keys(env.md2url), ...Object.keys(env.md2urls)])].filter(key => path.posix.basename(key) === normalized);
        if (keys.length > 1) {
            throw new Error(`Ambiguous Markdown link "${href}" in ${env.inputPath ?? 'unknown file'}: ${keys.sort().join(', ')}`);
        }
        if (keys[0]) {
            mapped = lookup(keys[0]);
        }
    }
    if (!mapped) {
        throw new Error(`Unknown relative link in ${env.inputPath ?? 'unknown file'}: "${href}"\nMarkdown file not found in sitemap.`);
    }

    return mapped + suffix;
}

/**
 * The assets stage copies downloads flat to the artifact root under their file
 * names. When its selection is known, the link must name exactly the copied
 * source; anything else would silently 404 or serve a same-named file from
 * another repository.
 */
function resolveDownload(href: string, target: string, suffix: string, env: BridgeEnv): string {
    const normalized = path.posix.normalize(target.replace(/\\/g, '/'));
    const filename = path.posix.basename(normalized);
    if (env.downloads !== undefined) {
        const input = env.inputPath?.replace(/\\/g, '/').replace(/^\.\//, '');
        const source = input ? path.posix.join(path.posix.dirname(input), normalized) : normalized;
        const published = env.downloads[filename];
        if (published !== source) {
            const owner = published === undefined ? 'no external repository provides it' : `the published "${filename}" comes from ${published}`;
            throw new Error(`Download link "${href}" in ${env.inputPath ?? 'unknown file'} points to ${source}, but ${owner}`);
        }
    }

    return '/' + encodeURIComponent(filename) + suffix;
}

function findClosestUrl(urls: string[], currentUrl: string): string {
    const unique = [...new Set(urls)];
    const scores = unique.map(url => ({ url, score: commonPrefixSegments(url, currentUrl) }));
    const bestScore = Math.max(...scores.map(candidate => candidate.score));
    const best = scores.filter(candidate => candidate.score === bestScore);
    if (best.length !== 1) {
        throw new Error(`Ambiguous Markdown target for ${currentUrl}: ${unique.sort().join(', ')}`);
    }

    return best[0]!.url;
}

function commonPrefixSegments(a: string, b: string): number {
    const pa = a.split('/');
    const pb = b.split('/');
    let i = 0;
    while (i < pa.length && i < pb.length && pa[i] === pb[i]) {
        i++;
    }
    return i;
}

function resolveHeading(
    text: string,
    level: number,
    env: BridgeEnv,
    customAnchor: string | null,
): { anchor: string; cleanText: string; rawText: string } {
    const working = customAnchor === null ? text : text.replace(/\s*\{#[^}]+\}$/, '').trim();
    // Actual HTML nodes were excluded before literal text reaches this step.
    const cleanText = working.replace(/^\d+(?:\.\d+)*\.\s+(?=\S)/, '').trim();
    env.headingStack.splice(level - 1);
    env.headingStack[level - 1] = cleanText.replace(/[<>]/g, '');
    const anchor =
        customAnchor ?? buildHierarchicalAnchor(env.headingStack.slice(0, level), env.slugifyOpts);

    if (anchor && env.generatedIds.has(anchor)) {
        throw new Error(`Duplicate heading ID: "${working}" generates "${anchor}"`);
    }
    if (anchor) {
        env.generatedIds.add(anchor);
    }
    // `rawText` keeps a numbered prefix (`12. Foo`) so source links written as `#12-foo` resolve.
    return { anchor, cleanText, rawText: working };
}

/**
 * Link a heading to itself. A heading that already contains a link gets a
 * separate empty self-link named after the heading, because links cannot nest.
 */
function wrapHeadingAnchor(children: BEMTree[], anchor: string, text: string): BEMTree[] {
    const containsLink = (tree: BEMTree): boolean => {
        if (Array.isArray(tree)) {
            return tree.some(containsLink);
        }
        if (!tree || typeof tree !== 'object') {
            return false;
        }

        return tree.raw !== undefined ? /<a[\s>]/i.test(tree.raw) : (tree.block === 'article' && tree.elem === 'link') || containsLink(tree.content);
    };

    if (containsLink(children)) {
        return [md('heading-anchor', undefined, { href: `#${anchor}`, label: text }), ...children];
    }

    return [md('heading-anchor', children, { href: `#${anchor}` })];
}

/** Normalize legacy container fences only outside literal code fences. */
function normalizeContainerFences(src: string): string {
    let fence = '';
    return src.split('\n').map(line => {
        const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (match) {
            const marker = match[1]!;
            if (!fence) {
                fence = marker;
            } else if (marker[0] === fence[0] && marker.length >= fence.length && line.slice(match[0].length).trim() === '') {
                fence = '';
            }
            return line;
        }
        return fence ? line : line.replace(/^::: +([A-Za-z][\w-]*)\s*$/, ':::$1');
    }).join('\n');
}

/** CommonMark definitions may occur inside containers; the first wins. */
function collectDefinitions(tree: Root): Map<string, Definition> {
    const definitions = new Map<string, Definition>();
    const walk = (node: { type: string; children?: unknown[] }): void => {
        if (node.type === 'definition') {
            const definition = node as Definition;
            const key = definition.identifier.toUpperCase();
            if (!definitions.has(key)) {
                definitions.set(key, definition);
            }
        }
        for (const child of node.children ?? []) {
            walk(child as { type: string; children?: unknown[] });
        }
    };
    walk(tree);
    return definitions;
}
