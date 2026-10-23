/**
 * Pass 2 — serialize a resolved `BEMTree` to minimal HTML (openspec `templates`
 * spec). No templates are applied here; the tree is already resolved by
 * `renderToBemJson`. The serializer walks the tree emitting open tags, attrs,
 * and closing tags with contextual optional-end-tag omission rules.
 * Tight-list `</li>` and paragraph `</p>` omission use the resolved sibling
 * and parent tags. Void elements, SVG void-shaped self-close, and the
 * `raw` passthrough live here too.
 *
 * @module bem/render-to-html
 */

import type { BemNode, BEMTree } from './types.js';
import { classify } from './naming.js';
import { escapeText, escapeAttr, needsQuotes, VOID_TAGS, BOOLEAN_ATTRS, normalizeHtmlName } from './html/escape.js';

export interface HtmlOptions {
    /** When true, prepend `<!doctype html>` and append `\n\n` (document render). */
    document?: boolean | undefined;
}

/** Serialize a resolved tree to minimal HTML. */
export function renderToHtml(tree: BEMTree, opts: HtmlOptions = {}): string {
    const html = serializeLevel(tree, '', null, false, null, false, false, opts.document === true);
    return opts.document ? '<!doctype html>' + html + '\n\n' : html;
}

/** Sentinel tag for a text-string sibling (distinct from "no sibling"). */
const TEXT_TAG = '#text';

/**
 * Serialize one level. `nextSiblingTag` is the final tag of the next sibling
 * (for tight-list `</li>` omission); `insideSvg` switches descendants into SVG mode
 * (void-shaped children self-close); `parentTag`/`parentIsArticleList`/
 * `parentTightList` carry the list-context the omission rules need.
 */
function serializeLevel(
    tree: BEMTree,
    parentBlock: string,
    nextSiblingTag: string | null,
    insideSvg: boolean,
    parentTag: string | null,
    parentIsArticleList: boolean,
    parentTightList: boolean,
    documentMode: boolean,
): string {
    if (tree === null || tree === undefined || tree === false) return '';
    if (typeof tree === 'string') return escapeText(tree);
    if (Array.isArray(tree) || tree.tag === false) {
        const children = flattenChildren(tree, parentBlock);
        return children.map((child, i) => emitChild(
            child,
            parentBlock,
            i + 1 < children.length ? childTag(children[i + 1]!) : nextSiblingTag,
            insideSvg,
            parentTag,
            parentIsArticleList,
            parentTightList,
            documentMode,
        )).join('');
    }
    return emitChild(
        tree as BemNode,
        parentBlock,
        nextSiblingTag,
        insideSvg,
        parentTag,
        parentIsArticleList,
        parentTightList,
        documentMode,
    );
}

/** Flatten fragments before lookahead so omitted tags preserve sibling parents. */
function flattenChildren(tree: BEMTree, parentBlock: string): Array<BemNode | string> {
    if (tree === null || tree === undefined || tree === false) return [];
    if (typeof tree === 'string') return [tree];
    if (Array.isArray(tree)) return tree.flatMap((child) => flattenChildren(child, parentBlock));
    const block = tree.block ?? parentBlock;
    if (tree.tag === false && tree.raw === undefined) return flattenChildren(tree.content, block);
    return [tree.block || !block ? tree : { ...tree, block }];
}

/** Resolve a child's tag for sibling-lookahead (default `div`; `tag:false` → null; string → `#text`). */
function childTag(child: BemNode | string): string | null {
    if (typeof child === 'string') return TEXT_TAG;
    if (child.raw !== undefined) return '#raw';
    return child.tag === false ? null : normalizeHtmlName(child.tag ?? 'div');
}

/** Emit one resolved child, recursing into its content. */
function emitChild(
    child: BemNode | string,
    parentBlock: string,
    nextSiblingTag: string | null,
    insideSvg: boolean,
    parentTag: string | null,
    parentIsArticleList: boolean,
    parentTightList: boolean,
    documentMode: boolean,
): string {
    if (typeof child === 'string') {
        // A text-string child: the TEXT_TAG sentinel only matters to the
        // PREVIOUS sibling's omission; here we emit the text.
        return escapeText(child);
    }

    if (child.raw !== undefined) return child.raw;

    const block = child.block ?? parentBlock;
    const tag = child.tag === false ? null : (child.tag ?? 'div');
    const tagName = tag === null ? null : normalizeHtmlName(tag);

    // Entering an <svg> switches descendants into SVG mode: void-shaped
    // children (path/circle/rect/line/ellipse/polyline/polygon/use/stop) emit
    // `/>` instead of `<tag></tag>` (rule 7 of the HTML-output spec).
    const childInsideSvg = tagName === 'svg' || (insideSvg && tagName !== 'foreignobject');
    // Tight-list propagation: article__list auto-tightens (markdown.js style);
    // a consumer `tightList:true` flag on a <ul>/<ol> tightens too. article
    // keeps the trailing `</li>`; non-article template lists drop it.
    const isArticleList = child.block === 'article' && child.elem === 'list';
    const isListTag = tagName === 'ul' || tagName === 'ol';
    const childIsArticleList = isListTag && isArticleList;
    const childIsTightList =
        isListTag && (child.tightList === true || isArticleList);

    const inner = serializeLevel(
        child.content ?? null,
        block,
        null,
        childInsideSvg,
        tagName,
        childIsArticleList,
        childIsTightList,
        documentMode,
    );

    if (!tag) return inner;
    const open = openTag(tag, child);
    if (VOID_TAGS.has(tagName!)) return open + '>';

    // Inside SVG, an element with no content self-closes (`<path .../>`).
    if (childInsideSvg && inner === '' && SVG_VOIDISH.has(tagName!)) {
        return open + '/>';
    }

    const close = shouldEmitClose(tagName!, nextSiblingTag, parentTag, parentIsArticleList, parentTightList, insideSvg, documentMode);
    return open + '>' + inner + (close ? `</${tag}>` : '');
}

/** SVG child elements that self-close when empty (rule 7 — SVG void-shaped). */
const SVG_VOIDISH = new Set([
    'path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'use', 'stop',
]);

/** HTML Standard, optional tags: only these successors implicitly close p. */
const P_END_TAG_SUCCESSORS = new Set([
    'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'table', 'ul',
]);

/** HTML exclusions and foreign integration points are not eligible tail parents. */
const P_END_TAG_REQUIRED_PARENTS = new Set([
    'a', 'audio', 'del', 'ins', 'map', 'noscript', 'video',
    'foreignobject', 'math', 'mi', 'mo', 'mn', 'ms', 'mtext',
]);

function openTag(tag: string, node: BemNode): string {
    const cls = classify(node);
    const attrs = serializeAttrs(node.attrs, node.js, node);
    let out = `<${tag}`;
    if (cls) out += ` class=${quoteOrNot(escapeAttr(cls))}`;
    out += attrs;
    return out;
}

function serializeAttrs(attrs: BemNode['attrs'], js: BemNode['js'], node: BemNode): string {
    const parts: string[] = [];
    if (attrs) {
        for (const [name, val] of Object.entries(attrs)) {
            if (val === null || val === undefined || val === false) continue;
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
        // `data-bem` is always double-quoted, so `"` inside the JSON MUST be
        // `&quot;`-escaped or the attribute terminates early (RENDER-01).
        parts.push(` data-bem="${escapeAttr(dataBem)}"`);
    }
    return parts.join('');
}

function quoteOrNot(value: string): string {
    return needsQuotes(value) ? `"${value}"` : value;
}

function shouldEmitClose(
    tag: string,
    nextSiblingTag: string | null,
    parentTag: string | null,
    parentIsArticleList = false,
    parentTightList = false,
    insideSvg = false,
    documentMode = false,
): boolean {
    if (tag === 'html' || tag === 'head' || tag === 'body') {
        return nextSiblingTag === '#raw' || nextSiblingTag === TEXT_TAG;
    }
    if (tag === 'td' || tag === 'th') {
        return parentTag !== 'tr' || (nextSiblingTag !== null && nextSiblingTag !== 'td' && nextSiblingTag !== 'th');
    }
    if (tag === 'tr') {
        const rowParent = parentTag === 'table' || parentTag === 'thead' || parentTag === 'tbody' || parentTag === 'tfoot';

        return !rowParent || (nextSiblingTag !== null && nextSiblingTag !== 'tr');
    }
    if (tag === 'thead') {
        return parentTag !== 'table' || (nextSiblingTag !== 'tbody' && nextSiblingTag !== 'tfoot');
    }
    if (tag === 'tbody') {
        return parentTag !== 'table' || (nextSiblingTag !== null && nextSiblingTag !== 'tbody' && nextSiblingTag !== 'tfoot');
    }
    if (tag === 'tfoot') {
        return parentTag !== 'table' || nextSiblingTag !== null;
    }
    if (tag === 'li' && parentTag !== 'ul' && parentTag !== 'ol') {
        // Bare <li> (no list parent): always keep close.
        return true;
    }
    if (tag === 'li' && parentIsArticleList) {
        // markdown.js style: drop </li> before the next <li>, keep the trailing
        // one (golden: `<li>a<li>b<li>c</li>` — last item keeps its close).
        return nextSiblingTag !== 'li';
    }
    if (tag === 'li' && parentTightList) {
        // Template-built tight list (nav-index/section__body): drop </li>
        // between siblings AND at the tail — full removeOptionalTags parity.
        return nextSiblingTag !== null && nextSiblingTag !== 'li';
    }
    if (tag === 'li' && (parentTag === 'ul' || parentTag === 'ol')) {
        // Non-tight list (menu, article__list siblings, header__title):
        // keep every </li> — between siblings AND at the tail. Golden confirms:
        //   - <ul class=menu> and <ul class=article__list> keep trailing </li>;
        //   - <ol class=header__title> keeps every </li>.
        return true;
    }
    if (tag === 'p') {
        if (insideSvg) {
            return true;
        }
        if (nextSiblingTag !== null) {
            return !P_END_TAG_SUCCESSORS.has(nextSiblingTag);
        }
        // With body/html end tags omitted, formatter newlines otherwise become
        // part of the last paragraph instead of remaining outside it.
        if (documentMode && (parentTag === 'body' || parentTag === 'html')) {
            return true;
        }

        return parentTag === null || parentTag.includes('-') || P_END_TAG_REQUIRED_PARENTS.has(parentTag);
    }
    return true;
}
