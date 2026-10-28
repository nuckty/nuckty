import { createRemarkMarkdown } from './remark.js';
import type { RemarkOptions } from './remark.js';
import type { BEMTree } from '../bem/types.js';

export interface MarkdownOptions {
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
    slugify?: RemarkOptions['slugify'];
    /** Current Markdown file relative to the content root, for links and images. */
    sourceFile?: string;
    /** Page inputPath (relative to consumer root) — drives section-prefix image lookup. */
    inputPath?: string;
    /** Extra remark plugins (mdast transforms) registered via `env.markdown.use`. */
    remarkPlugins?: RemarkOptions['remarkPlugins'] | undefined;
    /** Generic-directive mappings registered via `env.markdown.directive(name, handler)`. */
    directiveMappings?: RemarkOptions['directiveMappings'] | undefined;
    /** GitHub-raw asset rewrite base (from `config/site.json` `githubRawBase`); null = no rewrite. */
    githubRawBase?: string | string[] | null | undefined;
}

export interface MarkdownResult {
    /** The article content as a BemNode tree. */
    tree: BEMTree;
    /** Headings collected during render, in document order. */
    headings: Array<{ level: number; text: string; rawText: string; anchor: string }>;
}

/** Create a markdown renderer that emits BemNode trees (remark/unified). */
export function createMarkdown(opts: MarkdownOptions = {}): {
    render: (src: string) => MarkdownResult;
} {
    const { parse } = createRemarkMarkdown(opts);
    return { render: parse };
}

// Re-export for tests / plugins that want the remark entry directly.
export { createRemarkMarkdown } from './remark.js';
export type { RemarkOptions, RemarkResult } from './remark.js';
