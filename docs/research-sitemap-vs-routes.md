# Sitemap-as-Explicit-Tree vs File-as-Route

> Historical research from an earlier implementation. The descriptions of the current engine and the proposed migrations below are historical, not the 1.0.0 contract. See the current [nu reference](nu.md) and [documentation review](../../plans/2026-10-05-documentation-review/RESEARCH.md).

> Audit nuckty's sitemap.yml approach against Hugo/Eleventy/Astro/Next file-as-route conventions.

## Summary

nuckty uses a single `config/sitemap.yml` file that declares the
entire site as an explicit nested tree: `Title [url, file.md,
{ layout }]`. This gives top-down control over URL structure,
layout assignment, breadcrumbs, and cross-document link resolution
in one place. File-as-route systems (Hugo, Eleventy, Astro, Next)
derive structure from the filesystem, which is more conventional
and less manual, but loses the single-source-of-truth property for
navigation metadata. For documentation-oriented sites -- nuckty's
target class -- the sitemap model wins because URL hierarchy,
page titles, and layout overrides are all authored together and
the tree is the navigation structure itself.

## nuckty's Sitemap Model

The sitemap is a YAML file with indentation-based nesting:

```
- Title [url, file.md, { layout: 'page-index' }]
  - Child Title [child-url, child.md]
```

Parsed by `parseIndentedSitemap` (`src/stages/sitemap.ts:89-139`)
which converts indentation levels into nested arrays of strings
(leaf items) and `{ [itemContent]: children[] }` objects (branch
items). The format is YAML-like but parsed with a custom indent
stack, not a standard YAML parser.

Each line is parsed by `parseSitemapLine`
(`src/stages/sitemap.ts:48-72`) which extracts `title`, `url`,
`file`, and an optional `{ layout: '...' }` meta object. The meta
is a relaxed JSON (unquoted keys, single quotes) parsed with regex
transforms.

## How processItems and buildFullUrl Work

`processItems` (`src/stages/sitemap.ts:173-218`) is the recursive
core. It walks the parsed tree and for each item:

1. Parses the line string via `parseSitemapLine` (line 180).
2. Builds the full URL from parent + current via `buildFullUrl`
   (line 187, called at line 202 for branch items).
3. For leaf items (string): pushes the full URL to the sitemap
   array and calls `pushPageData` (line 188-189).
4. For branch items (object with children): pushes a
   `{ [fullUrl]: childrenArray }` entry, registers the branch
   page, then recurses into children (line 204-212).

`buildFullUrl` (`src/stages/sitemap.ts:78-82`):

```typescript
export function buildFullUrl(parentUrl: string, currentUrl: string): string {
    if (currentUrl.startsWith('/')) return currentUrl;
    const cleanParent = parentUrl.replace(/\/$/, '');
    return `${cleanParent}/${currentUrl}`;
}
```

Absolute URLs (leading `/`) short-circuit; relative URLs are
joined to the parent. This means the tree's nesting depth directly
determines the URL hierarchy.

`pushPageData` (`src/stages/sitemap.ts:151-171`) extracts metadata
for each page:

- `section`: first URL segment (line 154).
- `breadcrumbs`: all ancestor URL segments joined (line 155-157).
- `layout`: from the parsed meta, if present (line 167-169).
- Title generation: root title suffix, breadcrumb names, section
  dedupe, password-page prefix (line 240-269).

Cross-document link resolution: the `md2url` / `md2urls` / `url2md`
maps (line 272-283) are built from the final page set. These maps
are passed to the markdown renderer (`src/stdown/index.ts:504-512`)
so that `.md` links in content resolve to site URLs.

## Layout Fallback (html.ts)

The HTML stage resolves each page's layout with a three-tier
fallback (`src/stages/html.ts:58-61`):

```typescript
const rawLayout = (page.layout as string | undefined) ?? '';
const layout = ctx.env.layouts.get(rawLayout)
    ?? ctx.env.layouts.get(basenameNoExt(rawLayout))
    ?? ctx.env.layouts.get('page');
```

1. Exact match on the raw layout string from sitemap.yml.
2. Basename without extension (handles legacy njk paths like
   `blocks/page-index/page-index.njk` -> `page-index`).
3. Default `page` layout.

This means: the sitemap can specify a per-page layout, and if it
does not, the default `page` layout is used. No front-matter or
per-file configuration is needed -- the sitemap is the sole
authority for layout assignment.

## File-as-Route Conventions

### Hugo

Hugo uses the filesystem: `content/docs/page.md` produces
`/docs/page/`. Structure is implicit from directory layout. Layout
is determined by the `_index.md` / `index.md` convention, the
`type` front-matter field, or the section name. Breadcrumbs are
derived from the path but not explicitly authored. Cross-doc
links use `relref` shortcodes or `.RelPermalink`.

### Eleventy

Eleventy maps input files to output URLs based on directory
structure and permalink templates (front matter or data cascade).
URLs are not fixed until build time. Navigation is typically built
separately (e.g., via an eleventy-navigation plugin or hand-written
JSON). Layouts are assigned via front-matter `layout` key, with a
data cascade from directory-level data files.

### Astro

Astro's file-based routing: `src/pages/docs/page.astro` -> URL
`/docs/page`. Dynamic routes via `[slug].astro` file naming.
Layouts are imported as components and wrapped around content.
Navigation must be built separately (no built-in nav tree). Cross-
doc link resolution is manual (import or relative path).

### Next.js (App Router)

Next.js App Router: `app/docs/page.tsx` -> `/docs`. Layouts are
`layout.tsx` files that wrap all pages in their subtree (nested
layouts). Navigation is not derived; it must be built separately.
Dynamic routes via `[slug]/page.tsx` folder naming. Metadata is
exported from each page file.

## Sitemap.yml Strengths

1. Single source of truth: URL, title, source file, and layout
   are all in one file (`src/stages/sitemap.ts:48-72`). No need to
   open each `.md` file to check or change its URL or layout.

2. Top-down authoring: the site structure is visible at a glance.
   Adding a page means adding one line to sitemap.yml, not creating
   a directory structure. Reordering navigation is editing YAML,
   not moving files.

3. Recursive URL building: nesting depth determines URL hierarchy
   via `buildFullUrl` (`src/stages/sitemap.ts:78-82`). No separate
   URL-to-file mapping configuration.

4. Breadcrumbs for free: `pushPageData` computes breadcrumbs from
   the URL parts (`src/stages/sitemap.ts:155-157`). No separate
   breadcrumb generation logic.

5. Cross-doc link resolution: the `md2url` map
   (`src/stages/sitemap.ts:272-283`) lets content authors write
   standard `.md` links (`[see X](docs/x.md)`) that resolve to
   site URLs at build time. The sitemap is the authoritative
   file-to-URL mapping.

6. Per-page layout override: the `{ layout: 'page-index' }` meta
   in the sitemap line, with a graceful fallback to the default
   `page` layout (`src/stages/html.ts:58-61`). No per-file front
   matter needed.

7. Title generation: the full page title (with breadcrumb names
   and root suffix) is computed from the sitemap tree
   (`src/stages/sitemap.ts:240-269`). No per-file title management.

8. Navigation IS the sitemap: the same tree that drives the build
   also produces the site navigation menu. No separate nav config
   file.

## What look like weaknesses are actually the design

The "weaknesses" a file-as-route author would list are, for nuckty's
target class, deliberate features:

1. **Every page must be listed in sitemap.yml (no drop-in files).**
   This is a large benefit, not a cost: every page is intentional. There
   is no accidental content, no half-finished draft that ships, no file
   that appears at a URL nobody curated. The site is exactly what someone
   authored — nothing more. A documentation site is a curated artifact;
   a gatekeeper is correct.

2. **The sitemap is the only hierarchy; the filesystem is free-form.**
   The final URL structure comes **only** from sitemap.yml. The `.md`
   source files can live anywhere — flat, nested, in different repos, in
   `external/<repo>/` aggregates — because the sitemap is the single
   source of truth for URL/title/layout. There is no requirement that
   the directory tree mirror the URL tree; the two are independent.
   `buildFullUrl` (`src/stages/sitemap.ts:78-82`) derives the URL from
   nesting in the sitemap, not from any path on disk.

3. **No implicit routes.** A dropped file does not magically appear.
   This is the same point as #1, and it is exactly right: routing is
   authored, not emergent.

4. **Scale.** For very large sites (hundreds of pages) sitemap.yml
   grows, but the one-line-per-page indentation format stays compact
   and scannable. This is the one genuine scaling pressure, and it is
   mild for the target class (docs, dozens to low-hundreds of pages).

5. **Layout lives in the sitemap, not per-file front matter.** This is
   the point of the sitemap. Layout assignment is centralized because
   layout is a site-level concern, not a per-document one. Most pages
   share a layout (the default); the rare override is one token in the
   sitemap line, not a front-matter header scattered across content
   files. Treating "no per-file front matter" as a weakness inverts the
   design: the sitemap IS where layout/title/URL are decided, so a page
   with a non-default layout is one edit in one place — not two files.
   The data cascade (directory data files in Eleventy, layered front
   matter in Hugo) exists precisely to recover what the sitemap gives
   you directly: a single, top-down, explicit mapping.

The only real pressure is scale (#4). For nuckty's target — curated
documentation, not an app with dynamic routes — the explicit tree is
the correct, not merely acceptable, choice.

## Where nuckty Wins

nuckty's sitemap model excels for documentation sites:

- Documentation sites have a stable, curated navigation tree. The
  author wants control over URL structure, order, and grouping --
  not implicit filesystem ordering.

- All pages are known at authoring time. There is no user-generated
  content that needs implicit routing. The gatekeeper property is
  a feature, not a bug.

- Cross-document linking is critical for docs. The `md2url` map
  (`src/stages/sitemap.ts:272-283`) provides build-time `.md`-to-URL
  resolution, so authors write standard Markdown links without
  knowing the final URL scheme.

- Breadcrumbs and section grouping are needed for every docs page.
  They are computed from the sitemap tree at no authoring cost
  (`src/stages/sitemap.ts:155-157`, 240-269).

- Layout consistency: most docs pages use the same layout. Per-page
  overrides are rare and handled by the sitemap meta, not by
  scattering front matter across content files.

## Recommendation

Use sitemap.yml for documentation-oriented sites and curated
content sites where:

- The navigation tree is the primary organizing structure.
- All pages are known at authoring time.
- Cross-document linking is important.
- URL structure, titles, and layout are managed centrally.
- The site has dozens to low-hundreds of pages (sitemap.yml stays
  manageable).

Use file-as-route (Hugo/Eleventy/Astro/Next) for:

- Sites with dynamic or user-generated content where pages appear
  without central registration.
- Sites where the filesystem structure is the desired URL
  structure and no manual curation is needed.
- Sites with hundreds+ pages where a single sitemap file becomes
  unwieldy.
- Apps where routing is handled by the framework (Next.js, Astro)
  and the "pages" are interactive components, not authored content.

For nuckty's target class (documentation sites), the explicit-tree
sitemap is the correct choice. The cost (manual maintenance,
filesystem duplication) is outweighed by the benefit (single
source of truth, top-down control, free breadcrumbs, cross-doc
link resolution). The weakness (no implicit routes) is a feature
for docs -- every page is intentional.
