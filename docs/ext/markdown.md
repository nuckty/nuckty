# Markdown extensions

The catalog of `markdown`-type extensions. They add [markdown constructs](../how/ext/markdown.md) to CommonMark: galleries, grids, video. Each is wired up through `env.markdown`.

## How it works

Directive-based constructs use [generic directives](../how/ext/markdown.md) (`:::name`, `::name`, `:name`). An extension maps a directive straight to a block node via `env.markdown.directive(...)` and any other mdast node type via `env.markdown.node(...)`; for other syntax and arbitrary transforms there is the low-level `env.markdown.use(...)`. The full contract is in the [markdown extension guide](../how/ext/markdown.md).

See the [guide](../how/ext/markdown.md) for an explicit MDAST conversion example. `node.children` is MDAST, not [BEMTree](../how/bemjson.md): do not assign it directly to `content`.

A markdown construct almost always comes paired with a [block extension](block.md) that ships the block it expands into. That is why one package often combines a markdown extension and a block extension.

## Registry

Markdown extensions:

- [`@nuckty/ext-markdown-typography-ru`](markdown/typography-ru.md) — Russian typography: a non-breaking space before a dash. Adds no block — it only adjusts text.
- [`@nuckty/ext-markdown-video`](markdown/video.md) — video embedding `@[provider](id)` (YouTube/RuTube/VK). Ships the `video` block with its template and CSS.

Markdown constructs that come paired with a block live in block extensions:

- **Gallery** (`:::gallery`) — in the [`@nuckty/ext-block-gallery`](block/gallery.md) package.
- **Grid** (`:::grid`) — in the [`@nuckty/ext-block-grid`](block/grid.md) package.
- **Callout** (`:::callout`) — a candidate for a separate package.
