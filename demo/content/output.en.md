# Files from this build

`npm run build` runs `nuckty build` and produces five pages per language: Russian in `site/`, English in `site-en/`. Below you can open pages, styles, scripts and images, and compare compressed file sizes.

## What the build produced

<section class="artifact-viewer" aria-label="Build files"><p class="artifact-viewer__status" aria-live="polite">Loading the file list…</p><div class="artifact-viewer__summary"></div><div class="artifact-viewer__files"></div></section>

[Download the file list](/build-files.txt). Sizes and hashes come from the current artifact. Compressed copies are shown for comparison; nginx selects them using `Accept-Encoding`, while direct access to `brotli/` and `gzip/` is blocked.

This snapshot is taken before manifest generation and excludes `build-files.txt` itself and the final `manifest.json`. The deployment manifest is available locally in `site-en/manifest.json`.

## From a Markdown file to a URL

A target is one website output. Its configuration sets the language, domain and output directory. The sitemap maps source files to page URLs.

```ts
en: {
    configDir: 'config/en/',
    outDir: 'site-en/',
    lang: 'en',
    host: 'demo.nuckty.com',
}
```

```yaml
sitemap:
  - nuckty in action [/, index.en.md, { layout: "landing" }]
  - Markdown and links [/markdown, markdown.en.md]
  - Gallery and grid [/media, media.en.md]
  - Live engine [/playground, playground.en.md]
  - Build output [/output, output.en.md]
```

## Artifact contents

| Files | Purpose |
| --- | --- |
| `html/` | Pages after Markdown and templates |
| `css/` and `js/` | Style and script bundles with content hashes |
| `svg/` and raster-format directories | Images with hashed filenames |
| `brotli/` and `gzip/` | Compressed pages and assets |
| `.htaccess` | Apache configuration |
| `manifest.json` | File sizes and hashes for deployment |

The nginx configuration is generated separately under `.build/`. It supports local preview and is not part of the output root.

## Build, preview and validate

Run these commands from the demo directory. Preview requires nginx; HTML validation requires Java. Use `default` for Russian and `en` for English.

```bash
npm run build
npx @nuckty/core serve en --port 8094
npx @nuckty/core validate en
npx @nuckty/core stop en
```

The core provides `build`; extensions provide `serve` and `validate`. FTP/FTPS publication is available through `deploy-ftp` after server configuration. The demo never deploys automatically.

Other extensions prepare AVIF/WebP, fetch content repositories or add video. They are documented in the nuckty extension catalog and are not run by this demo.

## Shared blocks, two languages

Both this demo and the documentation website build Russian and English from shared blocks, with separate sitemaps and output roots. Language switching opens the same route on the other domain; the document handler emits `hreflang` links.

[Return to the demo](index.en.md)
