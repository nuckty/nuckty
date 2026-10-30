# nuckty

> Every static site generator is terrible. This one is simply a little less terrible.

nuckty is a static site generator for documentation and content projects with a programmable [build pipeline](how/pipeline.md). A build produces pages, assets, pre-compressed copies of selected files, and hosting configuration. The directory can be published to a compatible server.

## Why nuckty

### The sitemap as an explicit tree

The site structure is described in a single file, [`sitemap.yml`](how/sitemap.md): URLs, headings, page metadata, and navigation. Adding a Markdown file alone does not publish a page through the core build; review the registered content before release. Published URLs are separate from source paths. [Templates](how/templates.md) use these data during the build.

### A programmable build pipeline

The [build pipeline](how/pipeline.md) has fixed phases, named stages, and `before`/`after` hooks. Extensions add stages and hooks; replacing a core stage by registering its name again is not supported.

### Extensions are the only mechanism

The core ships no page blocks — only default templates for its Markdown output; even the HTML page wrapper comes from an [extension](how/ext/index.md). Extensions wire everything through a single entry point — blocks, commands, build stages, markdown constructs. You install exactly what you need.

### One engine for content and layout

Markdown becomes a [BEMJSON tree](how/bemjson.md). The same nu engine processes content and document blocks. The current HTML stage serializes content first, then passes it to the document handler in a `raw` node.

### Compression at build time

At [build time](out/compression.md), the engine creates Brotli Q11 and Gzip 9 copies of selected nonempty files in `brotli/` and `gzip/`. The server selects a prepared copy using `Accept-Encoding`; the build generates the corresponding [nginx and Apache configuration](out/hosting.md).

### Image format selection at a single URL

For a raster image, the build copies the original and available [AVIF/WebP variants](out/images.md), prepared separately. The server selects an available format at one logical URL using `Accept`. The build does not require both variants.

### Minimal HTML

The engine [minimizes HTML](out/html.md): it omits supported optional end tags and unnecessary quotes without adding formatting indentation. Newlines in text and `raw` are preserved. Document validity depends on templates and raw HTML; validate the actual artifact.

### FTP deployment via a manifest

The [`nuckty deploy-ftp`](ext/command/deploy-ftp.md) command compares a local manifest (file sizes and hashes) against the state of the server and uploads only the files that changed. That is enough for the simplest shared hosting with FTP: no SSH, no rsync, no git on the server.

### Multiple sites from one repository

One repository can build [several sites](how/targets.md) at once — for example, language versions on separate domains. The engine constructs matching routes on related hosts, without checking page existence, and passes `hreflang` data to the block. How exactly to render `<link rel=alternate>` is the author's call.

### Link resolution

Authors link to `.md` files; the engine maps them to sitemap URLs. A missing relative `.md` target or an ambiguous target in a nonempty sitemap fails the build. Unknown heading fragments may be preserved, so also check links in the finished site.

### Russian typography

For Russian-language sites there is a [typography extension](how/markdown.md) — it keeps a dash from breaking the line: it inserts a non-breaking space before an em dash and a regular one after. All without manual markup; an English-language site does not need the extension.

## Where to go next

- [Getting started](how/start.md) — installation and the first site build.
- [How to use it](how/index.md) — the data model, templates, sitemap, build pipeline.
- [The output](out/index.md) — build results: HTML, assets, compression, hosting.
- [Extensions](ext/index.md) — the ecosystem extension catalog.
- [Why this way](why/index.md) — architectural decisions and their rationale.

