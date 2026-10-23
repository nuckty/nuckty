# Pipeline extensions

The catalog of `pipeline`-type extensions — those that add [build stages](../how/ext/pipeline.md). Pages live directly under `/ext/pipeline/<name>`, with no additional topical subsections.

## How it works

A [pipeline](../how/pipeline.md) extension registers a stage or a hook via `env.pipeline`:

```ts
export function register(env) {
    env.pipeline.after('html', searchIndexStage);
}
```

The full contract is in the [pipeline extension guide](../how/ext/pipeline.md).

## Registry

There are no official pipeline extensions yet. Possible extensions:

- Search index (Orama, SQLite FTS5, lunr) — a stage after [HTML](../out/html.md); reads page content.
- A custom [hosting](../out/hosting.md) configuration — a stage in `emit`; generates a Caddy or other server configuration.
- Image preparation — `before('images', ...)`: creates variants before the [images stage](../out/images.md) hashes and copies the family.
- SEO sitemap or RSS/Atom — a stage generates XML from the [sitemap tree](../how/sitemap.md). The core copies a supplied `robots.txt` from the target configuration directory; an extension must generate `sitemap.xml`.

