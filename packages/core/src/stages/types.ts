/**
 * Shared store artifact types for build stages.
 *
 * Stages write typed artifacts into `ctx.store` for later stages to consume.
 * These interfaces document the contract between stages (e.g. the css stage
 * reads `imageMapping` produced by the images stage). The pipeline store is
 * Record<string, unknown>; readStore/writeStore provide typed accessors, while
 * current stages also narrow or cast their artifacts directly.
 *
 * @module stages/types
 */

import type { BEMTree } from '../bem/types.js';

/** Per-page metadata produced by the sitemap stage. Mirrors `pages[url]` from build-sitemap.js. */
export interface SitemapPage {
    file: string;
    url: string;
    name: string;
    title: string;
    section: string | null;
    breadcrumbs: string[];
    /** Rendered BemNode content tree (produced by createMarkdown().render). */
    tree?: BEMTree;
    /** Headings collected during render, in document order. */
    headings?: Array<{ level: number; text: string; rawText: string; anchor: string }>;
    /** Optional layout path from sitemap.yml meta. */
    layout?: string;
    [k: string]: unknown;
}

/** Sitemap artifact stored under `ctx.store.sitemap`. Mirrors the build-sitemap.js output object. */
export interface SitemapArtifact {
    /** Navigation entries: routes, child arrays, or cross-section labels. */
    sitemap: unknown[];
    /** Per-page metadata keyed by route from the site root, e.g. /help. */
    pages: Record<string, SitemapPage>;
    /** Markdown file → single URL (last URL wins). */
    md2url: Record<string, string>;
    /** Markdown file → all URLs (for shared files). */
    md2urls: Record<string, string[]>;
    /** URL → markdown file. */
    url2md: Record<string, string>;
}

/** One CSS/JS bundle's hash record. Mirrors hash-css.json / hash-js.json entries. */
export interface BundleHashEntry {
    hash: string;
    filename: string;
    url: string;
    source: string[];
}

/** Image stats entry (subset used downstream). */
export interface ImageStatEntry {
    source: string;
    size: number;
    hash: string;
    ref: string;
    format: string;
    avif: boolean;
    webp: boolean;
}

/** Typed view over `ctx.store`. All fields optional; populated as stages run. */
export interface BuildStore {
    sitemap?: SitemapArtifact;
    /** `relative image path → hashed ref` (e.g. "logo/logo.png" → "_i<hash>"). */
    imageMapping?: Record<string, string>;
    imageStats?: Record<string, ImageStatEntry>;
    /** `bundle name → hash record` for CSS. */
    cssHash?: Record<string, BundleHashEntry>;
    /** `bundle name → hash record` for JS. */
    jsHash?: Record<string, BundleHashEntry>;
    /** `video filename → hashed filename`. */
    videoHash?: Record<string, string>;
    /** Available / missing external repos discovered by the assets stage. */
    assetRepos?: { available: string[]; missing: string[] };
    /** Per-bundle BEM declaration (block-name lists) produced by the deps loader. */
    blockDeps?: Record<string, string[]>;
    [k: string]: unknown;
}

/** Read a typed artifact from a generic store object. */
export function readStore<T>(store: Record<string, unknown>, key: string): T | undefined {
    return Object.hasOwn(store, key) ? store[key] as T : undefined;
}

/** Write a typed artifact into a generic store object. */
export function writeStore<T>(store: Record<string, unknown>, key: string, value: T): void {
    Object.defineProperty(store, key, { value, writable: true, enumerable: true, configurable: true });
}

