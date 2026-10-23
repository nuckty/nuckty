# Markdown

Page text is written in Markdown. The engine converts Markdown into a `BEMTree` — the same data model from which it builds the page layout and the [HTML](../out/html.md) wrapper.

The remark/unified stack does the parsing: first micromark scans the text, then remark builds mdast — a typed Markdown tree. The [Markdown engine decision](../why/markdown.md) explains why not markdown-it.

## What the core supports

The core supports CommonMark and GFM features: tables, strikethrough (`~~text~~`), task lists (`- [x]`), and autolinks. It also parses `:::name` directives for [markdown extensions](ext/markdown.md). The mdast → [BEMJSON](bemjson.md) bridge converts parsed nodes into a `BEMTree`.

## Hierarchical anchors

The engine assigns identifiers to headings by the hierarchical anchors rule. When a section is nested, the identifier is compound:

```md
# Шины              → id="шины"
## Зимние            → id="шины-зимние"
### Шипованные       → id="шины-зимние-шипованные"
```

Cyrillic is preserved in identifiers — no transliteration, no encoding. A numbered prefix (`1. `, `1.2. `) is removed from the visible heading and anchor; a slash becomes a hyphen. Periods elsewhere remain: `# Version 2.4.3.` gets the anchor `version-2.4.3.`. You can link to an anchor in Cyrillic directly.

A custom ID can be supplied as a trailing plain-text `{#id}` suffix, for example `# **Title** {#custom}`. The suffix is removed from visible heading content; the same text inside code, a link, or emphasis remains literal.

## Cross-references

Authors write ordinary Markdown links to `.md` files:

```md
See the [data model](../how/bemjson.md).
```

The engine converts the path into a URL using the `md2url` map built from the [sitemap](sitemap.md). You can also link to an anchor in another document:

```md
See [studs](../free/tyres.md#шины-зимние-шипованные).
```

The engine turns the anchor into the target page's final hierarchical identifier. A link to a missing `.md` document fails the build. Unknown fragments remain unchanged because page [templates](templates.md) can provide their own identifiers. The author does not need to know the final URL — a path to the file is enough.

## Images

An image link in Markdown is a logical address. The engine resolves it to a hashed image-family URL through `image-mapping.json`, shared by Markdown and CSS. The images stage copies prepared AVIF/WebP variants, and the server selects the format. For details, see [output images](../out/images.md).

```md
![Caption](images/tyre.png)   → <img class=article__image src=/_ia1b2c3d4e5f6a7b8 alt="Caption">
```

The author writes one link; the server serves the right format.

## Typography

Russian text typography is a [markdown extension](ext/markdown.md): before the HTML build, it walks the Markdown tree and keeps the dash from breaking away from the word — it puts a non-breaking space before an em dash and a regular space after. Code nodes are left untouched.

Since it is an extension and not part of the core, an English-language site does not need it — it is simply not connected.

## Markdown constructs come from extensions

Gallery, grid, callout, and video constructs are **not in the core**. The core knows no specific `:::gallery` or `:::callout` construct. [Markdown extensions](ext/markdown.md) add them: a handler converts the construct into BEMJSON nodes of the corresponding block.

```md
:::gallery
![a](1.png) ![b](2.png)
:::
```

Here `:::gallery` is markdown extension syntax. Without the extension, the engine unwraps the directive and renders its Markdown children normally. See the [markdown extensions](../ext/markdown.md) catalog.

## Inline HTML

Inline HTML from Markdown (for example, a `<span>` in text) is preserved as `raw`: the serializer does not escape or minimize it. The parser does not sanitize HTML or validate document structure. A separate pass does rewrite logical `img src` paths through the [image mapping](../out/images.md). Supply only trusted HTML.

Image mapping changes actual `img src` values, whether quoted or unquoted. Image-shaped text inside attributes, comments, scripts, styles, and literal elements is preserved.

Parsed text spacing around inline HTML and links is preserved: `Hello <em>world</em>` keeps the separating space, while `x[link](/target)` gains no extra space. Typography remains opt-in.

## Programmatic use

During the build, relative links and image paths are resolved against the current Markdown file’s directory within the content root. The content root’s directory name does not affect resolution. When calling `createMarkdown` directly, set `sourceFile` to the file’s path relative to the content root; retain `inputPath` for diagnostics and existing integrations when needed.

```ts
import { createMarkdown } from 'nuckty';

const { tree } = createMarkdown({
    sourceFile: 'guide/start.md',
    inputPath: './content/guide/start.md',
    md2url: { 'index.md': '/' },
    imageMapping: { 'images/logo.png': '_i1234567890123456' },
}).render('[Home](../index.md) ![Logo](../images/logo.png)');
```
