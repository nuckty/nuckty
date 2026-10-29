# Extensions

The catalog of nuckty ecosystem extensions. Extensions fall into [five types](../how/ext/index.md); each type has its own section. A page's address mirrors the package name: `/ext/block/root` → `@nuckty/ext-block-root`.

Each official extension is a separate npm package in the nuckty monorepository and implements the [`register(env)` contract](../how/ext/index.md). The nuckty core depends on none of them.

## By type

- [Pipeline extensions](pipeline.md) — add build stages.
- [Markdown extensions](markdown.md) — add markdown constructs.
- [Block extensions](block.md) — add sets of BEM blocks.
- [Command extensions](command.md) — add CLI commands.
- [Document extensions](document.md) — build a document from page data.

## How to add your own

An extension implements `register(env)`. The [guide](../how/ext/index.md) describes the contract. To document one, add a page, a catalog link and an entry in the documentation's `pages.json`. Publishing an npm package alone does not change the catalog.

## What is in the ecosystem

A quick summary:

| Package | Type | Purpose |
|---|---|---|
| [`@nuckty/ext-block-root`](block/root.md) | block, document | [HTML](../out/html.md) page wrapper (`root`) |
| [`@nuckty/ext-block-gallery`](block/gallery.md) | block, markdown | Gallery with a lightbox |
| [`@nuckty/ext-block-grid`](block/grid.md) | block, markdown | Multi-column page layout (`:::grid`) |
| [`@nuckty/ext-markdown-video`](markdown/video.md) | markdown | Video embedding `@[provider](id)` (YouTube/RuTube/VK) |
| [`@nuckty/ext-markdown-typography-ru`](markdown/typography-ru.md) | markdown | Russian typography (dashes, non-breaking spaces) |
| [`@nuckty/ext-command-deploy-ftp`](command/deploy-ftp.md) | command | Deploy over FTP via a manifest |
| [`@nuckty/ext-command-convert-images`](command/convert-images.md) | command | Encoding [images](../out/images.md) to AVIF/WebP |
| [`@nuckty/ext-command-content-external`](command/content-external.md) | command | Content from external git repositories |
| [`@nuckty/ext-command-serve`](command/serve.md) | command | Local site serving and shutdown |
| [`@nuckty/ext-command-validate-vnu`](command/validate-vnu.md) | command | W3C Nu Checker (optional extension, JVM) |
