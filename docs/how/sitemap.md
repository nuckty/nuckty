# Sitemap: sitemap.yml

A single file, `config/sitemap.yml`, defines the site structure. It is an explicit tree: each line defines a page, and the nesting of the lines determines the URL hierarchy. One file is the single place where URLs, titles, per-page metadata, and navigation are defined.

The [sitemap decision](../why/sitemap.md) explains why this way instead of the familiar file-as-route.

## Line format

The `.yml` file is read by a custom indentation parser; full YAML syntax is not supported. Use two spaces per level and unquoted list entries. The `sitemap:` header occupies its own line, optionally uses the empty form `sitemap: []`, and may have a trailing comment; it cannot contain a page declaration. Known `layout` and `navLabel` values must be strings. Quotes inside metadata values are allowed. An invalid page entry or unparsable metadata fails the build instead of silently dropping the entry.

```
Title [address, file.md, { layout: "name" }]
```

- **Title** — the text before the brackets. The engine includes it in the sitemap data; the registered document handler receives it, and the standard root extension uses it in `<title>`.
- **address** — the last segment of the page URL. The engine uses an absolute one (with a leading `/`) as is; a relative one is appended to the parent's URL.
- **file.md** — the path to the content file relative to the content root: the first level in [levels.json](blocks/levels.md) (`content/` by default). The root can be a local directory or a clone of an [external repository](external.md).
- **`{ layout: "name" }`** — optional page metadata. The engine stores the value in `page.layout` and passes it to the registered document handler. The handler may use it when choosing a template; the engine does not select a template or provide a default `page` template.

The source must remain inside the selected content root after symlinks are resolved. An explicit symlink content root and file aliases within that root are supported; links to outside files fail before their content is read.

## Nesting defines URLs

Indentation depth defines the hierarchy. An example from a real documentation site:

```yaml
sitemap:
  - Home [/, index.md]
  - How to build [how, how/index.md]
    - Getting started [start, how/start.md]
    - Data model [bemjson, how/bemjson.md]
```

- `Home` → `/`
- `How to build` → `/how`
- `Getting started` → `/how/start` (the relative `start` joined the parent `/how`)
- `Data model` → `/how/bemjson`

The directory tree and the URL tree are independent: where an `.md` file lives does not affect the URL — the final URL is determined by the sitemap alone.

## Breadcrumbs and navigation

From the `sitemap.yml` tree the engine builds URLs, breadcrumbs, and the menu structure — you do not define them by hand. There is no separate navigation file.

## Layout metadata

Set optional layout metadata on a sitemap line, rather than in the content file:

```yaml
- Home [/, index.md, { layout: "landing" }]
- Documentation [docs, docs/index.md]
```

This sets `page.layout` to `landing`; it changes the rendered page only if the registered document handler reads that field. The standard `nuckty-ext-block-root` handler wraps every page in `root` and does not select a template from `page.layout`. For document handlers and blocks, see [blocks](blocks/index.md) and [nu.ts templates](templates.md).

## Cross-references

Authors write ordinary Markdown links to `.md` files:

```md
See the [data model](how/bemjson.md).
```

The engine converts the path into a URL using the `md2url` map built from the sitemap. The author does not need to know the final URL — linking to the file is enough. For details, see the [Markdown](markdown.md) section.

## When a sitemap does not fit

For sites with dynamic or user-generated content, where pages appear without central registration, an explicit tree is inconvenient. nuckty is not designed for that: the sitemap is built for curated documentation with a structure known in advance.

