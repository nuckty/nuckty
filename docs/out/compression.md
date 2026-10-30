# Compression

The engine creates Brotli and Gzip copies of selected nonempty files in `brotli/` and `gzip/`. It selects files with the extensions `.html`, `.css`, `.js`, `.svg`, `.xml` and `.txt`. `robots.txt` is excluded. See the [compression decision](../why/compression.md).

## Two codecs

| Codec | File | Level | Purpose |
|---|---|---|---|
| Brotli | `.br` | Q11 (maximum) | Preferred representation when accepted |
| Gzip | `.gz` | 9 | Universal fallback |

Version 1.0 supports no other codecs. Adding one requires measurements and a change to the artifact and hosting contract.

```
site/html/how_bemjson.html        ← original
site/brotli/how_bemjson.html.br   ← Brotli Q11
site/gzip/how_bemjson.html.gz     ← Gzip 9
```

Each pre-compressed copy keeps the original's flat filename and adds a codec suffix. The `brotli/` and `gzip/` directories are not served directly — the nginx configuration closes them off.

## Build determinism

The engine normalizes byte 9 (the tenth byte) of the gzip header (the OS field) to `0xFF` ("unknown"), so builds on macOS and on Linux use the same OS marker. Identical bytes also require the same compressor/runtime versions. A different OS marker changes the compressed file’s hash and causes unnecessary uploads during [manifest-based publication](../ext/command/deploy-ftp.md); the manifest itself remains correct. For the full rationale, see the [compression decision](../why/compression.md).

Brotli has no such header, so it needs no extra normalization.

## Server-side negotiation

The [hosting configuration](hosting.md) looks for explicit `br` and `gzip` tokens with nonzero `q` and selects an available copy in a fixed order: Brotli, then Gzip, then the original. `Content-Encoding` matches the selected file. A simplified word match does not reproduce these rules.

The rules do not rank codecs by their `q` values or enable a codec from `*` alone. The fallback is the original file; `identity;q=0` does not make the generated configuration return `406`. If a site needs different negotiation behavior, customize its serving rules.

## Why compress in advance, not on the fly

On-the-fly compression uses server CPU. Its cost depends on the compression level, caching, and server configuration. Nuckty performs this work during the build and prepares Brotli Q11 and Gzip 9 copies.

At request time, the generated configuration selects a suitable prepared copy or the original. This requires the server modules and settings described in the [hosting guide](hosting.md).

## What is not compressed

Selection uses filenames, not content inspection. Files with other names, including `.json` and ordinary binary extensions, receive no compressed copies; neither do `robots.txt` or empty files. `.htaccess` and `manifest.json` are written after compression. Copies use flat directories, so matching basenames from different source directories cause an error.
