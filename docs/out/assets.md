# Assets: CSS and JS

The engine bundles CSS and JS by [block dependencies](../how/blocks/deps.md). Every bundle name includes a content-hash, so the files can have a long cache lifetime. The manifest stores sizes and hashes — the [publish command](../ext/command/deploy-ftp.md) uses it.

## Static files from external repositories

The `assets` stage copies PDF, ZIP, and INI files from declared external repositories to the artifact root, using each filename as the output name. Hidden directories such as `.git` or `.venv` and `node_modules` are skipped. If multiple candidates have the same filename, the build fails. Set `assetSources` in `config/site.json` to select an owner explicitly; map the output filename to the exact source path relative to the consumer project root:

```json
{
    "assetSources": {
        "manual.pdf": "external/docs/manual.pdf"
    }
}
```

The selected path must match an existing candidate for that filename. A missing or mismatched candidate fails the build. Unique filenames need no entry. MP4 files use the same collision and `assetSources` rules, but their output names include a streamed content hash.

A relative Markdown link to a PDF, ZIP, or INI file points to `/<filename>`. The build fails if the link resolves to a file other than the one the stage copied under that name, for example a file outside the external repositories or a same-named file from another repository.

## Bundles by dependencies

A bundle collects styles and scripts from its block declaration; it is not inferred automatically from page content. If a block is listed in [dependencies](../how/blocks/deps.md), its `block.css` and `block.js` land in the bundle. Blocks absent from the declaration are not included.

The bundle name comes from `site.json` → `bundles`. For example, with `"bundles": ["docs-layout"]`, the engine reads `docs-layout.bemdecl.js` and builds the `docs-layout` bundle from that declaration.

The stages build every bundle listed in `site.json`. The standard `root` includes all supplied CSS and JS on every page. For page-specific bundle selection, define that policy in your document handler or overridden `root` template.

## CSS

Lightning CSS inlines `@import`, adds prefixes, processes nested rules, and minifies CSS. Nuckty's own stage code then rewrites `url()` using `.build/image-mapping.json` and inlines eligible SVGs.

The result is a `<hash>.css` file in the `css/` directory:

```
site/css/a1b2c3d4.css
```

The hash in the name is a content-hash: the first 16 hexadecimal characters of the file's MD5 (the same algorithm as in the manifest). The name depends on the content, so the file can have a long cache lifetime: when the content changes, the hash changes too. Hashes on this page are shortened for readability.

## JS

esbuild bundles JS in the IIFE format, targets ES2018, and minifies the code. The result is a `<hash>.js` file in the `js/` directory:

```
site/js/e5f6a7b8.js
```

The JS bundle name also depends on a content-hash.

## Rewriting image references

In CSS, [images](images.md) are referenced through `url(...)`. At build time the engine rewrites these references via `image-mapping.json`: the logical path is replaced with the path to the file with the hash in its name. The Markdown bridge uses the same `image-mapping.json`, so names in CSS and in [HTML](html.md) always agree.

```css
/* source */
.icon { background: url(images/icon.png); }

/* result */
.icon{background:url(/_i9f8e7d6a1b2c3d4)}
```

## manifest.json

The manifest records artifact files with sizes and hashes, excluding `manifest.json` itself. The scan runs after `.htaccess` is written. The [FTP publication extension](../ext/command/deploy-ftp.md) uses it to compare the manifest against the files on the server: only what has changed gets uploaded.

```json
{
    "css/a1b2c3d4.css": { "size": 12450, "hash": "a1b2c3d4e5f6a7b8" },
    "js/e5f6a7b8.js":   { "size": 8920,  "hash": "e5f6a7b8c1d2e3f4" },
    "html/how_bemjson.html": { "size": 3200, "hash": "..." }
}
```

The hash is the first 16 hexadecimal characters of the MD5 of the full file contents, including for large binary files such as ZIP and PDF. Keys are sorted, so the manifest is deterministic.

## Immutable cache

The configuration gives files with hashed names a long cache lifetime (10 years) and `Cache-Control: public, immutable`. HTML uses `no-cache`: it may be stored, but must be revalidated before reuse. See [hosting configuration](hosting.md).

