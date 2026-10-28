# Sitemap instead of implicit routes

## Decision

Define pages in one [`config/sitemap.yml`](../how/sitemap.md). Each entry specifies the title, URL, source file, and optional metadata such as `layout`.

## Context

Documentation sites need deliberate page order, URL structure, and navigation. A content directory may contain drafts and assets that should not automatically become pages.

## Alternatives

**Routes derived from file paths.** This reduces explicit registration when the directory structure matches the desired URLs. Page order and navigation metadata still need a representation.

**Per-file metadata.** URLs and layout metadata can be stored with each document. This keeps local settings near the content, but makes a site-wide structure harder to review in one place.

**An explicit page tree.** This adds a registration step but separates published URLs from the location of Markdown sources.

## Argument

A sitemap entry binds the title, URL, and source file in one place. Relative URLs extend the parent URL; absolute URLs start from the site root. Source directories do not have to mirror URL directories.

The engine prepares breadcrumbs from URL segments and builds the Markdown-to-URL maps used for [cross-document links](../how/markdown.md). One source file may have several routes; the bridge selects an appropriate candidate or reports ambiguity.

The sitemap passes `layout` as page metadata. The registered document handler and site [templates](../how/templates.md) decide how to use it; the core does not choose a default layout block.

## Consequences

Adding a Markdown file alone does not publish a page: add a sitemap entry. This makes the publication list explicit, but does not review the content of registered pages.

As the site grows, the sitemap needs editorial maintenance. For automatically generated or dynamic routes, a different routing model may be more suitable.

