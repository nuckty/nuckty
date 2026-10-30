# Build output

After `nuckty build`, `outDir` holds a static artifact ready to deploy. Pages are built in advance; the server does not generate them for each request. Publication requires the serving rules described in the [hosting guide](hosting.md).

## What's inside

- [HTML](html.md) — minimal HTML5; structural validity depends on [templates](../how/templates.md).
- [Assets: CSS and JS](assets.md) — bundles by dependencies, content-hash, `manifest.json`.
- [Images](images.md) — AVIF/WebP under a single address, a shared `image-mapping.json`.
- [Compression](compression.md) — Brotli Q11 + Gzip 9, with the gzip OS byte normalized to `0xFF`.
- [Hosting configuration](hosting.md) — `nginx.conf` and `.htaccess`, content negotiation.

## Artifact structure

```
site/                        ← outDir, deployed in full
├── html/<flat>.html         ← pages: /how/bemjson → how_bemjson.html
├── css/<hash>.css           ← CSS bundles with content-hash
├── js/<hash>.js             ← JS bundles with content-hash
├── avif/ , webp/            ← image variants: <hash>.avif, <hash>.webp
├── png/ , jpg/ , svg/       ← original images: <hash>.<ext>
├── brotli/ , gzip/          ← pre-compressed copies (flat filenames + codec suffix)
├── manifest.json            ← sizes and hashes for manifest-based publication
└── .htaccess                ← for shared hosting with Apache
```

Flat filenames are part of the model: the hierarchical path `/how/bemjson` becomes the file `how_bemjson.html`. On request, the server maps the URL to the corresponding flat filename. For details, see [hosting configuration](hosting.md).

## Ready to publish

The artifact includes `.htaccess` for compatible Apache hosting. `nginx.conf` is separate in `.build`; `nuckty serve` generates its own runtime file. Copy `outDir` using the chosen delivery method; the [FTP extension](../ext/command/deploy-ftp.md) supports FTP/FTPS. The remote server must apply the required serving rules.
