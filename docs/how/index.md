# How to use

This is the path from installing nuckty and your first build to your own extensions.

## Where to start

- [Start](start.md) — installation and a first site in five steps.

## Concepts

The key concepts of nuckty:

- [Data model: BEMJSON](bemjson.md) — a typed tree of nodes, shared by content, page layout, and the page wrapper.
- [nu.ts templates](templates.md) — the `block()(...)` syntax, modes, specificity. How a block becomes [HTML](../out/html.md).
- [Sitemap: sitemap.yml](sitemap.md) — one tree defines URLs, titles, page templates, and navigation.
- [Build pipeline](pipeline.md) — phases, named stages, and hooks; how to change the build with code.
- [Targets and hreflang](targets.md) — one repository, several sites, language selection.
- [External repositories](external.md) — content from separate repositories.

## Content

- [Markdown](markdown.md) — the same engine turns CommonMark into a tree of blocks. Anchors, links, typography.

## Structure and extensions

- [Blocks](blocks/index.md) — how to write `.nu.ts`, declare dependencies, and manage [levels](blocks/levels.md).
- [Extensions](ext/index.md) — five types: `pipeline`, `markdown`, `block`, `command`, `document`. A single entry point, `register(env)`.

## How to read

Start with the [starter project](start.md): you will build and edit your first page there. Then explore the [data model](bemjson.md), [templates](templates.md) and [sitemap](sitemap.md) to extend your site.

If you are experienced, jump straight to the concept you need. And if you are curious why things are done this way, see the ["Why this way"](../why/index.md) section.
