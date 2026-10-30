# Images

Raster images use a logical URL; the server selects an available format using `Accept`. The build copies the original and prepared variants. See the [hosting decision](../why/hosting.md).

## What the engine writes

For every source image, the engine distributes the prepared variants across format directories. The filename is a content-hash, with no original name:

```
site/
  avif/9f8e7d6.avif      ← prepared AVIF variant
  webp/9f8e7d6.webp      ← prepared WebP variant
  png/9f8e7d6.png        ← original, fallback
```

The hash includes the original extension and bytes and any available AVIF/WebP variants. Changing any representation changes the URL. Example hashes are shortened; real hashes have 16 hexadecimal characters. See [assets](assets.md) for caching.

## One address in HTML

The markup carries a single reference — a logical address of the form `/_i<hash>`:

```html
<img class=article__image src=/_i9f8e7d6 alt="Шина">
```

The server serves the first existing format in order: AVIF, then WebP, then the original:

```nginx
location ~ ^/_i([a-f0-9]+)$ {
    set $hash $1;
    try_files $avif_dir/$hash.avif $webp_dir/$hash.webp /png/$hash.png /jpg/$hash.jpg /jpg/$hash.jpeg /svg/$hash.svg /$hash.gif /webp/$hash.webp =404;
}
```

Both servers inspect `Accept`: AVIF and WebP variants require an explicit supported format with nonzero `q`. nginx maps it to `$avif_dir` and `$webp_dir`; Apache uses rewrite conditions. The server then tries the original. A WebP-only original also works without `Accept`. Responses include `Vary: Accept`.

## image-mapping.json

So that Markdown and CSS reference images consistently, the engine builds a shared mapping file, `.build/image-mapping.json`:

```json
{
    "free/light.png": "_i62e5723492d14dc0"
}
```

The value is stored without a leading `/` — the resolver adds it on read. The Markdown bridge rewrites paths in `![](...)` from this file. The CSS stage rewrites `url(...)` from the same file. As a result, the hashed names in [HTML](html.md) and in CSS agree, and the server picks the format from a single address.

Exact normalized mapping keys take precedence. Markdown also checks the path relative to the current source file before trying a basename-only reference. A basename fallback must identify one image; ambiguity fails the build. Later image levels override the same source-relative name.

## Lazy loading

The [gallery](../ext/block/gallery.md) omits `loading=lazy` on its first image and adds it to the others. This does not identify the first image on the page or the first viewport. Other blocks define their own loading policy.

## Raster and vector

The [pipeline](../how/pipeline.md) scans PNG, JPEG, GIF, WebP, and SVG. It copies available AVIF/WebP siblings for raster originals; the [conversion command](../ext/command/convert-images.md) creates them for PNG/JPEG. SVG is not encoded: it is stored as `svg/<hash>.svg`, and eligible CSS references are inlined as `data:` URIs. ICO and standalone AVIF sources are not scanned.

## Why this way

With `<picture>` and nested `<source>`, each image lists its formats in the markup. Nuckty centralizes format selection in generated server rules; the [hosting decision](../why/hosting.md) explains the tradeoff.

The [server](hosting.md) selects the format. A new codec may require changes to image collection, conversion, and configuration generation; changing serving rules alone is not sufficient.
