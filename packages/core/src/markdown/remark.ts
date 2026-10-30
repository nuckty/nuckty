/** remark/unified Markdown bridge with trusted raw HTML and extension hooks. */

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
    Blockquote,
    Table,
    TableRow,
    PhrasingContent,
    Link,
    Image,
    Text,
    Strong,
    Emphasis,
    Html,
    InlineCode,
    Definition,
} from 'mdast';
import { toString } from 'mdast-util-to-string';
import { buildHierarchicalAnchor } from './anchors.js';
import { transformImagePathShared } from './image-mapping.js';
import type { BemNode, BEMTree } from '../bem/types.js';
import type { DirectiveConverters, DirectiveHandler, DirectiveNode } from '../env/env.js';

export type { DirectiveHandler } from '../env/env.js';

export interface RemarkOptions {
    /** Map of original image paths → hashed filenames (built by the images stage). */
    imageMapping?: Record<string, string>;
    /** Resolved md path → page URL map, for relative `.md` link resolution. */
    md2url?: Record<string, string>;
    /** Resolved md path → array of candidate page URLs (when multiple .md share a path). */
    md2urls?: Record<string, string[]>;
    /** Current page URL, used to resolve relative links and anchors. */
    currentUrl?: string;
    /** Site origin used to keep rewritten raw-asset URLs absolute in copied code. */
    baseUrl?: string;
    /** Slugify options for heading anchors. */
    slugify?: Parameters<typeof buildHierarchicalAnchor>[1];
    /** Current Markdown file relative to the content root, for links and images. */
    sourceFile?: string;
    /** Page inputPath (relative to consumer root) — drives section-prefix image lookup. */
    inputPath?: string;
    /** Published download filename → source path relative to the consumer root (built by the assets stage). */
    downloads?: Record<string, string>;
    /** Extra remark plugins to apply after the core parse (mdast transforms).
     * Registered by extensions via `env.markdown.use(plugin)` (openspec `extensions`). */
    remarkPlugins?: Array<import('unified').Plugin<[], Root>> | undefined;
    /**
     * Generic-directive mappings registered by markdown-extensions via
     * `env.markdown.directive(name, handler)` (openspec `markdown` spec). The
     * core looks up a handler by directive name and emits its BemNode; a
     * directive with no mapping falls back to its plain content.
     */
    directiveMappings?: Map<string, DirectiveHandler> | undefined;
    /**
     * Base URL for GitHub-raw asset links a consumer wants rewritten to a
     * site-root path (`<base><file>` → `/<file>`). A consumer-specific value
     * (e.g. `https://github.com/<org>/<repo>/raw/refs/heads/main/`) set in
     * `config/site.json` (`githubRawBase`) and threaded through the sitemap
     * stage; `null`/absent disables the rewrite (openspec `core`: the engine
     * knows no specific site or repository). A single string or an array of
     * prefixes (one per repo); matched as a literal URL prefix (not a regex).
     */
    githubRawBase?: string | string[] | null | undefined;
}

export interface RemarkResult {
    /** The article content as a BemNode tree. */
    tree: BEMTree;
    /** Headings collected during render, in document order. */
    headings: Array<{ level: number; text: string; rawText: string; anchor: string }>;
}

interface BridgeEnv {
    definitions: Map<string, Definition>;
    headingStack: string[];
    generatedIds: Set<string>;
    headings: Array<{ level: number; text: string; rawText: string; anchor: string }>;
    imageMapping: Record<string, string>;
    md2url: Record<string, string>;
    md2urls: Record<string, string[]>;
    currentUrl: string;
    baseUrl?: string;
    slugifyOpts: Parameters<typeof buildHierarchicalAnchor>[1];
    sourceFile?: string;
    /** Page inputPath (relative, e.g. `./external/<repo>/<section>/<file>.md`) — used by section-prefix image lookup. */
    inputPath?: string;
    /** Published download filename → source path relative to the consumer root (built by the assets stage). */
    downloads?: Record<string, string>;
    /** Generic-directive mappings (env.markdown.directive) — name → handler. */
    directiveMappings?: Map<string, DirectiveHandler> | undefined;
    /** GitHub-raw rewrite base (from `config/site.json` `githubRawBase`); null = no rewrite. */
    githubRawBase?: string | string[] | null | undefined;
}

/** Create a remark/unified markdown renderer that emits BemNode trees. */
export function createRemarkMarkdown(opts: RemarkOptions = {}): {
    parse: (src: string) => RemarkResult;
} {
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        // Extension-registered mdast transforms (env.markdown.use) — applied
        // after the core parse. The Russian typography plugin is one such
        // extension (`@nuckty/ext-markdown-typography-ru`), registered by the
        // consumer via `ext[]`; the core knows nothing about typography.
        .use(opts.remarkPlugins ?? []);

    const parse = (src: string): RemarkResult => {
        const normalised = normalizeContainerFences(src);

        const parsed = processor.parse(normalised) as Root;
        // Run the registered transformers (typography) over the parsed tree.
        const tree = processor.runSync(parsed) as Root;
        const env: BridgeEnv = {
            definitions: collectDefinitions(tree),
            headingStack: [],
            generatedIds: new Set(),
            headings: [],
            imageMapping: opts.imageMapping ?? {},
            md2url: opts.md2url ?? {},
            md2urls: opts.md2urls ?? {},
            currentUrl: opts.currentUrl ?? '',
            slugifyOpts: opts.slugify ?? {},
            directiveMappings: opts.directiveMappings,
        };
        if (opts.baseUrl !== undefined) {
            env.baseUrl = opts.baseUrl;
        }
        if (opts.inputPath !== undefined) {
            env.inputPath = opts.inputPath;
        }
        if (opts.sourceFile !== undefined) {
            env.sourceFile = opts.sourceFile;
        }
        if (opts.githubRawBase !== undefined) {
            env.githubRawBase = opts.githubRawBase;
        }
        if (opts.downloads !== undefined) {
            env.downloads = opts.downloads;
        }
        const nodes = blocksToBem(tree.children, env, false);
        return { tree: nodes, headings: env.headings };
    };

    return { parse };
}

// ---- block nodes → BemNode --------------------------------------------------

function blocksToBem(
    children: Root['children'],
    env: BridgeEnv,
    insideListItem: 'tight' | 'loose' | false,
): BemNode[] {
    const out: BemNode[] = [];
    for (const node of children) {
        switch (node.type) {
            case 'heading': {
                out.push(headingToBem(node, env));
                break;
            }
            case 'paragraph': {
                // Video extensions produce block HTML among phrasing children.
                // Flush prose around each block instead of nesting a div in p.
                let pending: Array<BemNode | string> = [];
                const flush = (): void => {
                    if (!pending.length) {
                        return;
                    }
                    if (insideListItem === 'tight') {
                        out.push(...pending as BemNode[]);
                    } else {
                        out.push({ tag: 'p', block: 'article', elem: 'paragraph', content: pending });
                    }
                    pending = [];
                };
                for (const child of phrasingToBem(node.children, env)) {
                    if (typeof child !== 'string' && typeof child.raw === 'string' && /^<(?:div|p|ul|ol|table|section|article|blockquote|pre|h[1-6])(?=[\s/>])/i.test(child.raw)) {
                        flush();
                        out.push(child);
                    } else {
                        pending.push(child);
                    }
                }
                flush();
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
                out.push({ tag: 'hr', bem: false });
                break;
            }
            case 'blockquote': {
                out.push(blockquoteToBem(node as Blockquote, env));
                break;
            }
            case 'table': {
                out.push(tableToBem(node as Table, env));
                break;
            }
            case 'html': {
                out.push({ raw: (node as unknown as Html).value });
                break;
            }
            // Container directives: `:::name` (normalised from `::: name` above).
            // A markdown-extension maps the directive name to BEMJSON via
            // `env.markdown.directive(name, handler)` (openspec `markdown` spec).
            // The core knows no specific construct; an unmapped directive falls
            // back to its plain content.
            case 'containerDirective': {
                const d = node as unknown as { children?: Root['children']; name: string; attributes?: Record<string, string> };
                const rendered = invokeDirective(d, 'containerDirective', env);
                if (rendered) {
                    out.push(rendered);
                }
                else if (d.children && d.children.length > 0) {
                    for (const c of blocksToBem(d.children, env, false)) {
                        out.push(c);
                    }
                }
                break;
            }
            // leaf/text directives without a registered mapping fall back to their
            // plain content (openspec: unknown directive → plain content).
            case 'leafDirective': {
                const d = node as unknown as { children?: Root['children']; name: string; attributes?: Record<string, string> };
                const rendered = invokeDirective(d, 'leafDirective', env);
                if (rendered) {
                    out.push(rendered);
                }
                else if (d.children && d.children.length > 0) {
                    // The label is phrasing content: render it as the paragraph it stands in for.
                    out.push(...blocksToBem([{ type: 'paragraph', children: d.children as unknown as PhrasingContent[] }], env, insideListItem));
                }
                break;
            }
            case 'textDirective': {
                out.push(...phrasingToBem([node], env) as BemNode[]);
                break;
            }
            case 'footnoteDefinition': {
                out.push({ tag: 'div', attrs: { id: `fn-${node.identifier}` }, content: blocksToBem(node.children, env, false) });
                break;
            }
            default:
                break;
        }
    }
    return out;
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'listItem', 'blockquote', 'code', 'table', 'thematicBreak', 'containerDirective', 'leafDirective', 'footnoteDefinition', 'definition']);
const converters = new WeakMap<BridgeEnv, DirectiveConverters>();

/** Converters handed to directive handlers, created once per bridge env. */
function directiveConverters(env: BridgeEnv): DirectiveConverters {
    let convert = converters.get(env);
    if (!convert) {
        convert = {
            inline: (children) => {
                const block = (children as Array<{ type?: string }>).find((child) => BLOCK_TYPES.has(child.type ?? ''));
                if (block) {
                    throw new Error(`convert.inline received block node ${block.type}; use convert.blocks`);
                }
                return phrasingToBem(children as PhrasingContent[], env) as BEMTree;
            },
            blocks: (children) => blocksToBem(children as Root['children'], env, false),
        };
        converters.set(env, convert);
    }
    return convert;
}

/**
 * Call the registered handler for a directive. A handler that declines with
 * null may already have converted children; restore the page's heading and id
 * state so the plain-content fallback does not register them twice.
 */
function invokeDirective(
    node: { name: string; children?: unknown[]; attributes?: Record<string, string> },
    type: NonNullable<DirectiveNode['type']>,
    env: BridgeEnv,
): BemNode | null {
    const handler = env.directiveMappings?.get(node.name);
    if (!handler) {
        return null;
    }
    const headings = env.headings.length;
    const generatedIds = new Set(env.generatedIds);
    const headingStack = [...env.headingStack];
    const rendered = handler({ ...node, type }, env, directiveConverters(env));
    if (!rendered) {
        env.headings.length = headings;
        env.generatedIds = generatedIds;
        env.headingStack.splice(0, env.headingStack.length, ...headingStack);
        return null;
    }
    return rendered as BemNode;
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
    const wrapped = anchor ? wrapHeadingAnchor(children, anchor) : children;
    const bem: BemNode = {
        tag: `h${level}`,
        block: 'article',
        elem: 'heading',
        elemMods: { level: String(level) },
        content: wrapped,
    };
    if (anchor) {
        bem.attrs = { id: anchor };
    }
    env.headings.push({ level, text: cleanText, rawText: headingRaw, anchor });

    return bem;
}

function listToBem(node: List, env: BridgeEnv): BemNode {
    const items: BemNode[] = [];
    for (const item of node.children) {
        const itemKind: 'tight' | 'loose' = (item as unknown as { spread?: boolean }).spread ? 'loose' : 'tight';
        const inner = blocksToBem(item.children, env, itemKind);
        if (typeof item.checked === 'boolean') {
            inner.unshift({ tag: 'input', bem: false, attrs: { type: 'checkbox', disabled: true, checked: item.checked } });
        }
        items.push({ tag: 'li', block: 'article', elem: 'list-item', content: inner });
    }
    const elemMods = node.ordered ? { ordered: true } : {};
    return {
        tag: node.ordered ? 'ol' : 'ul',
        attrs: node.ordered && node.start !== null && node.start !== undefined && node.start !== 1 ? { start: String(node.start) } : {},
        block: 'article',
        elem: 'list',
        elemMods,
        content: items,
    };
}

function codeToBem(node: Code, env: BridgeEnv): BemNode {
    const content = node.value === '' ? node.value : transformGitHubLinksInText(node.value + '\n', env.githubRawBase, env.baseUrl);
    const buttonHtml =
        '<button type=button class=article__code-copy aria-label="Copy code to clipboard" title="Copy code"></button>';
    return {
        tag: 'pre',
        block: 'article',
        elem: 'code',
        content: [
            { tag: 'code', bem: false, content },
            { raw: buttonHtml },
        ],
    };
}

function blockquoteToBem(node: Blockquote, env: BridgeEnv): BemNode {
    const inner = blocksToBem(node.children, env, false);
    return { tag: 'blockquote', block: 'article', elem: 'blockquote', content: inner };
}

function tableToBem(node: Table, env: BridgeEnv): BemNode {
    const content: BemNode[] = [];
    let tbodyRows: BemNode[] = [];
    let hasTbody = false;
    for (let i = 0; i < node.children.length; i++) {
        const row = node.children[i]!;
        // First row is the header (GFM tables always have a header row).
        if (i === 0) {
            content.push({
                tag: 'thead',
                block: 'article',
                elem: 'table-head',
                content: [rowToBem(row, env, true, node.align)],
            });
        } else {
            tbodyRows.push(rowToBem(row, env, false, node.align));
            hasTbody = true;
        }
    }
    if (hasTbody) {
        content.push({
            tag: 'tbody',
            block: 'article',
            elem: 'table-body',
            content: tbodyRows,
        });
    }
    return { tag: 'table', block: 'article', elem: 'table', content };
}

function rowToBem(row: TableRow, env: BridgeEnv, isHeader: boolean, align: Table['align']): BemNode {
    const cells: BemNode[] = [];
    for (const [index, cell] of row.children.entries()) {
        const elemMods = isHeader ? { header: true } : {};
        // remark-gfm keeps U+00A0 at cell edges; trim it like other whitespace.
        const content = trimCellEdges(phrasingToBem(cell.children, env));
        cells.push({
            tag: isHeader ? 'th' : 'td',
            attrs: align?.[index] ? { style: `text-align:${align[index]}` } : {},
            block: 'article',
            elem: 'table-cell',
            elemMods,
            content,
        });
    }
    return { tag: 'tr', block: 'article', elem: 'table-row', content: cells };
}

/**
 * Trim leading/trailing whitespace (incl. U+00A0 nbsp) from the boundary string
 * children of a table cell, mirroring markdown-it's cell-trimming behaviour
 * (remark-gfm does not trim nbsp). Only touches plain string entries — raw and
 * BemNode children are left intact.
 */
function trimCellEdges(children: Array<BemNode | string>): Array<BemNode | string> {
    const out = children.slice();
    // leading edge
    for (let i = 0; i < out.length; i++) {
        const v = out[i];
        if (typeof v === 'string') {
            const trimmed = v.replace(/^[\s ]+/, '');
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
            const trimmed = v.replace(/[\s ]+$/, '');
            if (trimmed === '' && v !== '') { out.splice(i, 1); continue; }
            out[i] = trimmed;
            break;
        }
        break;
    }
    return out;
}

// ---- phrasing (inline) nodes → BemNode/text --------------------------------

function phrasingToBem(
    children: PhrasingContent[],
    env: BridgeEnv,
): Array<BemNode | string> {
    const out: Array<BemNode | string> = [];
    for (const node of children) {
        switch (node.type) {
            case 'text': {
                out.push((node as Text).value);
                break;
            }
            case 'inlineCode': {
                out.push({
                    raw: `<code class="article__inline-code">${escapeInlineCode(transformGitHubLinksInText((node as InlineCode).value, env.githubRawBase, env.baseUrl))}</code>`,
                });
                break;
            }
            case 'break': {
                out.push({ tag: 'br', bem: false });
                break;
            }
            case 'image': {
                out.push(imageToBem(node as Image, env));
                break;
            }
            case 'link': {
                const link = node as Link;
                const href = link.url;
                const resolved = resolveLink(href, env);
                const inner = phrasingToBem(link.children, env);
                out.push({
                    tag: 'a',
                    block: 'article',
                    elem: 'link',
                    attrs: { href: resolved, ...(link.title ? { title: link.title } : {}) },
                    content: inner,
                });
                break;
            }
            case 'linkReference': {
                const definition = env.definitions.get(node.identifier.toUpperCase());
                if (definition) {
                    out.push({ tag: 'a', block: 'article', elem: 'link', attrs: { href: resolveLink(definition.url, env), ...(definition.title ? { title: definition.title } : {}) }, content: phrasingToBem(node.children, env) });
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
                out.push({ tag: 'del', bem: false, content: phrasingToBem(node.children, env) });
                break;
            }
            case 'footnoteReference': {
                out.push({ tag: 'sup', bem: false, content: { tag: 'a', bem: false, attrs: { href: `#fn-${node.identifier}` }, content: node.label ?? node.identifier } });
                break;
            }
            case 'strong': {
                const strong = node as Strong;
                out.push({ tag: 'strong', bem: false, content: phrasingToBem(strong.children, env) });
                break;
            }
            case 'emphasis': {
                const em = node as Emphasis;
                out.push({ tag: 'em', bem: false, content: phrasingToBem(em.children, env) });
                break;
            }
            case 'html': {
                const htmlVal = (node as Html).value;
                out.push({ raw: htmlVal });
                break;
            }
            case 'textDirective': {
                const d = node as unknown as { name: string; children?: PhrasingContent[]; attributes?: Record<string, string> };
                const rendered = invokeDirective(d, 'textDirective', env);
                if (rendered) {
                    out.push(rendered);
                } else if (d.children?.length) {
                    out.push(...phrasingToBem(d.children, env));
                } else {
                    out.push(`:${d.name}`);
                }
                break;
            }
            default:
                break;
        }
    }
    return out;
}

/** Build an <img> BemNode from an image node, applying image-mapping rewrite. */
function imageToBem(node: Image, env: BridgeEnv): BemNode {
    const src = node.url;
    const alt = node.alt ?? '';
    const title = node.title ?? undefined;
    const resolved = transformImagePathShared(src, env);
    const attrs: Record<string, string> = { src: resolved, alt };
    if (title) {
        attrs.title = title;
    }
    return { tag: 'img', block: 'article', elem: 'image', attrs };
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
    if (/\.(zip|ini|pdf)$/i.test(target)) {
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
    // `rawText` is the heading text without the custom `{#id}` suffix but
    // WITH the numbered prefix (`12. Foo`), as written in the source — the
    // anchor map keys on `createGitHubSlug(rawText)` so source links carrying
    // the number (`#12-foo`) match (markdown.js:891 uses the raw heading text).
    return { anchor, cleanText, rawText: working };
}

/** Heading self-links use the same attribute serializer as ordinary links. */
function wrapHeadingAnchor(
    children: Array<BemNode | string>,
    anchor: string,
): Array<BemNode | string> {
    const containsLink = (tree: BEMTree): boolean => {
        if (Array.isArray(tree)) {
            return tree.some(containsLink);
        }
        return !!tree && typeof tree === 'object' && (tree.tag === 'a' || containsLink(tree.content));
    };
    const selfLink: BemNode = { tag: 'a', block: 'article', elem: 'heading-anchor', attrs: { href: `#${anchor}` } };
    if (containsLink(children)) {
        selfLink.attrs!['aria-label'] = 'Link to this heading';
        return [selfLink, ...children];
    }
    selfLink.content = children;
    return [selfLink];
}

/**
 * HTML-escape inline-code content, matching markdown-it's default code_inline
 * renderer (which escapes `&`, `<`, `>`). Golden carries e.g.
 * `SFTY maint -&gt; Air` inside `<code class="article__inline-code">`.
 */
function escapeInlineCode(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
