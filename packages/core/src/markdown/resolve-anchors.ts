import { createGitHubSlug } from './slugify.js';
import type { BemNode, BEMTree } from '../bem/types.js';
import type { SitemapArtifact, SitemapPage } from '../stages/types.js';

interface Heading {
    level: number;
    text: string;
    rawText: string;
    anchor: string;
}

export function buildAnchorMap(headings: Heading[] | undefined): Map<string, string> {
    const map = new Map<string, string>();
    if (!headings || headings.length === 0) {
        return map;
    }
    const seen = new Map<string, number>();

    for (const h of headings) {
        if (!h.anchor) {
            continue;
        }
        // `createGitHubSlug` keeps numbered prefixes (`12. Foo` → `12-foo`), the form source links use.
        const base = createGitHubSlug(h.rawText);
        if (!base) {
            continue;
        }

        // GitHub-style dedup: the first occurrence keeps the bare slug, the second gets `-1`, the third `-2`.
        const occurrence = (seen.get(base) ?? 0) + 1;
        seen.set(base, occurrence);
        const key = occurrence > 1 ? `${base}-${occurrence - 1}` : base;

        map.set(key, h.anchor);

        // A version heading `2.0.5` is also keyed as `205`, the form GitHub gives its anchor.
        const trimmed = h.rawText.trim();
        if (/^\d+\.\d+(\.\d+)?$/.test(trimmed)) {
            const versionKey = trimmed.replace(/\./g, '');
            map.set(versionKey, h.anchor);
        }
    }
    return map;
}

/** Resolve an anchor (`#anchor` or `url#anchor`) against a page's anchor map. */
function resolveAnchor(anchor: string, pageMap: Map<string, string> | undefined): string {
    if (!pageMap || !anchor) {
        return anchor;
    }
    // Direct lookup, then URL-decoded.
    let hit = pageMap.get(anchor);
    if (!hit) {
        try {
            const decoded = decodeURIComponent(anchor);
            if (decoded !== anchor) {
                hit = pageMap.get(decoded);
            }
        } catch {
            // keep original
        }
    }
    return hit ?? anchor;
}

/**
 * Rewrite anchor links in a page's BemNode tree in place. For each Markdown
 * link whose `href` carries a `#anchor`:
 *   - same-doc (`#anchor` or `<thisUrl>#anchor`): resolve against this page's map;
 *   - cross-doc (`<url>#anchor`): resolve against the target page's map (if the
 *     target is in the sitemap).
 * Generated heading self-links are skipped: they already point at final ids.
 * Unresolved anchors pass through verbatim.
 */
export function resolvePageAnchors(page: SitemapPage, sitemap: SitemapArtifact, anchorMaps: Map<string, Map<string, string>>): void {
    if (!page.tree) {
        return;
    }
    const thisMap = anchorMaps.get(page.url);
    walk(page.tree, (node) => {
        // Heading self-links already carry final ids; their GitHub-slug keys may name another heading.
        if (node.block !== 'article' || node.elem !== 'link' || typeof node.props?.['href'] !== 'string') {
            return;
        }
        const props = node.props;
        const href = node.props['href'];
        if (!href.includes('#')) {
            return;
        }
        const hashIdx = href.indexOf('#');
        const base = href.slice(0, hashIdx);
        const queryIndex = base.indexOf('?');
        const pathname = queryIndex < 0 ? base : base.slice(0, queryIndex);
        const query = queryIndex < 0 ? '' : base.slice(queryIndex);
        const anchor = href.slice(hashIdx + 1);
        if (!anchor) {
            return;
        }

        if (pathname === '' || pathname === page.url) {
            // same-document anchor
            const resolved = resolveAnchor(anchor, thisMap);
            props['href'] = `${query}#${resolved}`;
        } else if (sitemap.pages[pathname]) {
            // cross-document anchor: target page exists in the sitemap
            const targetMap = anchorMaps.get(pathname);
            const resolved = resolveAnchor(anchor, targetMap);
            props['href'] = `${base}#${resolved}`;
        }
        // else: external/unknown target — leave verbatim.
    });
}

/** Recursively walk a BEMTree, calling `visit` on every BemNode (mutable). */
function walk(tree: BEMTree, visit: (node: BemNode) => void): void {
    if (tree === null || tree === undefined || tree === false) {
        return;
    }
    if (typeof tree === 'string') {
        return;
    }
    if (Array.isArray(tree)) {
        for (const child of tree) {
            walk(child, visit);
        }
        return;
    }
    const node = tree as BemNode;
    visit(node);
    if (node.content) {
        walk(node.content, visit);
    }
}
