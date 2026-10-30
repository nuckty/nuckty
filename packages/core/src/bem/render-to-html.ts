/** Serialize resolved BEMJSON with structure-preserving HTML optional tags. */
import type { BemNode, BEMTree } from './types.js';
import { classify } from './naming.js';
import { escapeText, escapeAttr, needsQuotes, VOID_TAGS, BOOLEAN_ATTRS, normalizeHtmlName } from './html/escape.js';

type Namespace = 'html' | 'svg' | 'math';
interface Context {
    block: string;
    parent: string | null;
    parentNamespace: Namespace;
    namespace: Namespace;
    mathText: boolean;
    document: boolean;
}
interface Boundary {
    kind: 'none' | 'element' | 'text' | 'space' | 'comment' | 'opaque';
    tag?: string;
}
interface Following {
    first: Boundary;
    nonSpace: Boundary;
}
interface Emission {
    html: string;
    tag: string | null;
    omittedEnd: boolean;
    opaque: boolean;
}
const NONE: Boundary = { kind: 'none' };
const SVG_VOIDISH = new Set(['path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'use', 'stop']);
const BODY_METADATA = new Set(['meta', 'noscript', 'link', 'script', 'style', 'template']);
const P_END_TAG_SUCCESSORS = new Set([
    'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'table', 'ul',
]);
const P_END_TAG_REQUIRED_PARENTS = new Set(['a', 'audio', 'del', 'ins', 'map', 'noscript', 'video']);
const ASCII_SPACE = /^[\t\n\f\r ]/;

export interface HtmlOptions {
    /** Prepend the doctype and append two formatting newlines. */
    document?: boolean | undefined;
}

export function renderToHtml(tree: BEMTree, opts: HtmlOptions = {}): string {
    const html = serializeLevel(tree, { block: '', parent: null, parentNamespace: 'html', namespace: 'html', mathText: false, document: opts.document === true });

    return opts.document ? '<!doctype html>' + html + '\n\n' : html;
}

/** Flatten transparent fragments and ignore positions that emit no bytes. */
function flattenChildren(tree: BEMTree, parentBlock: string): Array<BemNode | string> {
    if (tree === null || tree === undefined || tree === false || tree === '') {
        return [];
    }
    if (typeof tree === 'string') {
        return [tree];
    }
    if (Array.isArray(tree)) {
        return tree.flatMap((child) => flattenChildren(child, parentBlock));
    }
    if (tree.raw === '') {
        return [];
    }
    const block = tree.block ?? parentBlock;

    if (tree.tag === false && tree.raw === undefined) {
        return flattenChildren(tree.content, block);
    }

    return [tree.block || !block ? tree : { ...tree, block }];
}

function elementNamespace(tag: string, ctx: Context): Namespace {
    if (ctx.mathText && (tag === 'mglyph' || tag === 'malignmark')) {
        return 'math';
    }
    if (ctx.parentNamespace === 'math' && ctx.parent === 'annotation-xml' && tag === 'svg') {
        return 'svg';
    }
    if (ctx.namespace === 'html') {
        return tag === 'svg' ? 'svg' : tag === 'math' ? 'math' : 'html';
    }

    return ctx.namespace;
}

/** Raw bytes remain opaque except for unambiguous whitespace/comment prefixes. */
function boundary(child: BemNode | string, ctx: Context, skipSpace = false): Boundary {
    if (typeof child !== 'string' && child.raw === undefined) {
        const tag = normalizeHtmlName(child.tag || 'div');

        return elementNamespace(tag, ctx) === 'html' ? { kind: 'element', tag } : { kind: 'opaque' };
    }
    const raw = typeof child !== 'string';
    let value = raw ? child.raw! : child;

    if (skipSpace) {
        value = value.replace(/^[\t\n\f\r ]+/, '');
    }
    if (value === '') {
        return NONE;
    }
    if (ASCII_SPACE.test(value)) {
        return { kind: 'space' };
    }
    if (raw) {
        return { kind: value.startsWith('<!--') ? 'comment' : 'opaque' };
    }

    return { kind: 'text' };
}

function serializeLevel(tree: BEMTree, ctx: Context): string {
    const children = flattenChildren(tree, ctx.block);
    const boundaries = children.map((child) => boundary(child, ctx));
    const nonSpaces: Boundary[] = [];
    let nonSpace = NONE;

    for (let i = children.length - 1; i >= 0; i--) {
        const current = boundary(children[i]!, ctx, true);

        if (current.kind !== 'none') {
            nonSpace = current;
        }
        nonSpaces[i] = nonSpace;
    }
    let previous: Emission | null = null;
    const output: string[] = [];

    for (let i = 0; i < children.length; i++) {
        const following = { first: boundaries[i + 1] ?? NONE, nonSpace: nonSpaces[i + 1] ?? NONE };
        previous = emitChild(children[i]!, ctx, following, previous);
        output.push(previous.html);
    }

    return output.join('');
}

function emitChild(child: BemNode | string, ctx: Context, following: Following, previous: Emission | null): Emission {
    if (typeof child === 'string' || child.raw !== undefined) {
        return { html: typeof child === 'string' ? escapeText(child) : child.raw!, tag: null, omittedEnd: false, opaque: typeof child !== 'string' && boundary(child, ctx).kind === 'opaque' };
    }
    const block = child.block ?? ctx.block;
    const tag = child.tag || 'div';
    const name = normalizeHtmlName(tag);
    const namespace = elementNamespace(name, ctx);
    const encoding = Object.entries(child.attrs ?? {}).find(([key]) => normalizeHtmlName(key) === 'encoding')?.[1];
    const mathText = namespace === 'math' && ['mi', 'mo', 'mn', 'ms', 'mtext'].includes(name);
    const integration = (namespace === 'svg' && ['foreignobject', 'desc', 'title'].includes(name)) || mathText ||
        (namespace === 'math' && name === 'annotation-xml' && typeof encoding === 'string' && ['text/html', 'application/xhtml+xml'].includes(normalizeHtmlName(encoding)));
    const childContext: Context = { block, parent: name, parentNamespace: namespace, namespace: integration ? 'html' : namespace, mathText, document: ctx.document };
    const inner = serializeLevel(child.content ?? null, childContext);
    const open = openTag(tag, child);

    if (namespace === 'html' && VOID_TAGS.has(name)) {
        return { html: open + '>', tag: name, omittedEnd: false, opaque: false };
    }
    if (namespace === 'svg' && inner === '' && SVG_VOIDISH.has(name)) {
        return { html: open + '/>', tag: name, omittedEnd: false, opaque: false };
    }
    const first = flattenChildren(child.content ?? null, block)[0];
    const firstBoundary = first === undefined ? NONE : boundary(first, childContext);
    const canOmitStart = namespace === 'html' && open === `<${tag}` && omitStart(name, ctx, firstBoundary, inner, previous);
    let close = namespace !== 'html' || emitClose(name, ctx, following);

    // An explicit end establishes the implied empty body before formatter newlines.
    if (ctx.document && inner === '' && ((name === 'body' && canOmitStart) || name === 'html')) {
        close = true;
    }

    return { html: (canOmitStart ? '' : open + '>') + inner + (close ? `</${tag}>` : ''), tag: name, omittedEnd: !close, opaque: false };
}

function omitStart(tag: string, ctx: Context, first: Boundary, inner: string, previous: Emission | null): boolean {
    if (tag === 'html') {
        // Leading whitespace does not protect an html-child comment from moving out.
        return ctx.parent === null && first.kind !== 'opaque' && !/^[\t\n\f\r ]*<!--/.test(inner);
    }
    if (ctx.parentNamespace !== 'html') {
        return false;
    }
    if (tag === 'head') {
        return ctx.parent === 'html' && (first.kind === 'none' || first.kind === 'element');
    }
    if (tag === 'body') {
        return ctx.parent === 'html' && (first.kind === 'none' || first.kind === 'text' || (first.kind === 'element' && !BODY_METADATA.has(first.tag!)));
    }
    if (ctx.parent !== 'table' || previous?.opaque) {
        return false;
    }
    if (tag === 'colgroup') {
        return first.tag === 'col' && !(previous?.tag === 'colgroup' && previous.omittedEnd);
    }
    if (tag === 'tbody') {
        return first.tag === 'tr' && !(previous?.omittedEnd && ['thead', 'tbody', 'tfoot'].includes(previous.tag ?? ''));
    }

    return false;
}

function emitClose(tag: string, ctx: Context, following: Following): boolean {
    const next = following.first;
    const peer = next.kind === 'element' ? next.tag : undefined;
    const tail = next.kind === 'none';
    const parent = ctx.parentNamespace === 'html' ? ctx.parent : null;

    if (tag === 'html' || tag === 'body') {
        return (tag === 'html' ? ctx.parent !== null : parent !== 'html') || following.nonSpace.kind === 'comment' || following.nonSpace.kind === 'opaque';
    }
    if (tag === 'head') {
        return parent !== 'html' || next.kind === 'space' || next.kind === 'comment' || next.kind === 'opaque';
    }
    if (tag === 'li') {
        return !['ul', 'ol', 'menu'].includes(parent ?? '') || !(peer === 'li' || tail);
    }
    if (tag === 'dt' || tag === 'dd') {
        return !['dl', 'div'].includes(parent ?? '') || !(peer === 'dt' || peer === 'dd' || (tag === 'dd' && tail));
    }
    if (tag === 'rt' || tag === 'rp') {
        return parent !== 'ruby' || !(peer === 'rt' || peer === 'rp' || tail);
    }
    if (tag === 'optgroup') {
        return parent === null || !(peer === 'optgroup' || peer === 'hr' || tail);
    }
    if (tag === 'option') {
        return parent === null || !(peer === 'option' || peer === 'optgroup' || peer === 'hr' || tail);
    }
    if (tag === 'colgroup' || tag === 'caption') {
        return parent !== 'table' || next.kind === 'space' || next.kind === 'comment' || next.kind === 'opaque';
    }
    if (tag === 'td' || tag === 'th') {
        return parent !== 'tr' || !(peer === 'td' || peer === 'th' || tail);
    }
    if (tag === 'tr') {
        return !['table', 'thead', 'tbody', 'tfoot'].includes(parent ?? '') || !(peer === 'tr' || tail);
    }
    if (tag === 'thead') {
        return parent !== 'table' || !(peer === 'tbody' || peer === 'tfoot');
    }
    if (tag === 'tbody') {
        return parent !== 'table' || !(peer === 'tbody' || peer === 'tfoot' || tail);
    }
    if (tag === 'tfoot') {
        return parent !== 'table' || !tail;
    }
    if (tag === 'p') {
        if (!tail) {
            return !P_END_TAG_SUCCESSORS.has(peer ?? '');
        }
        if (ctx.document && (parent === 'body' || parent === 'html')) {
            return true;
        }

        return parent === null || parent.includes('-') || P_END_TAG_REQUIRED_PARENTS.has(parent);
    }

    return true;
}

function openTag(tag: string, node: BemNode): string {
    const cls = classify(node);
    const attrs = serializeAttrs(node.attrs, node.js, node);
    let out = `<${tag}`;
    if (cls) {
        out += ` class=${quoteOrNot(escapeAttr(cls))}`;
    }
    out += attrs;
    return out;
}

function serializeAttrs(attrs: BemNode['attrs'], js: BemNode['js'], node: BemNode): string {
    const parts: string[] = [];
    if (attrs) {
        for (const [name, val] of Object.entries(attrs)) {
            if (val === null || val === undefined || val === false) {
                continue;
            }
            if (val === true || BOOLEAN_ATTRS.has(normalizeHtmlName(name))) {
                parts.push(` ${name}`);
            } else {
                const escaped = escapeAttr(String(val));
                parts.push(` ${name}=${quoteOrNot(escaped)}`);
            }
        }
    }
    if (js && node.bem !== false && node.block) {
        const params = js === true ? {} : js;
        const dataBem = JSON.stringify({ [node.block]: params });
        // `data-bem` is double-quoted, so `"` in the JSON must be escaped as `&quot;`.
        parts.push(` data-bem="${escapeAttr(dataBem)}"`);
    }
    return parts.join('');
}

function quoteOrNot(value: string): string {
    return needsQuotes(value) ? `"${value}"` : value;
}
