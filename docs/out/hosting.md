# Hosting configuration

At build time, nuckty generates a separate configuration for each class of hosting. The artifact supports local nginx and Apache shared hosting with FTP. Apache must allow `.htaccess` overrides and provide the required rewrite, header and MIME modules. The [hosting decision](../why/hosting.md) explains why.

## Two files

| File | Where it goes | For which hosting |
|---|---|---|
| `nginx.conf` | `buildDir/` | nginx hosting and integration checks |
| `.htaccess` | `outDir/` (deployed with the artifact) | Shared hosting with Apache and mod_rewrite |

A configuration generator builds both files: it emits the lines directly, without template engines like Nunjucks. There is nothing to write by hand.

The build always generates `nginx.conf`, including when you only need the Apache artifact. The nginx config generator rejects filesystem paths containing a dollar sign (`$`) or control characters. The generated config writes `/tmp/nginx-logs/<logPrefix>_access.log` and `<logPrefix>_error.log`; `logPrefix` in `site.json` defaults to `nuckty`.

## What's inside

The configuration handles five tasks. nginx and Apache inspect negotiation headers using their respective configuration syntax.

### 1. Choosing a compression codec

By the `Accept-Encoding` header, the server picks the directory with the pre-compressed file — `brotli/` first, then `gzip/`. In nginx, direct access to these directories is closed off. This abbreviated map shows priority only; the generated map also rejects zero-quality (`q=0`) encodings:

```nginx
map $http_accept_encoding $compression_dir {
    default   "";
    "~*\bbr\b"    "brotli/";
    "~*\bgzip\b"  "gzip/";
}
```

For details, see [compression](compression.md).

### 2. Choosing an image format

The server serves the first existing format in order for a single address: AVIF → WebP → the original:

```nginx
location ~ ^/_i([a-f0-9]+)$ {
    set $hash $1;
    try_files $avif_dir/$hash.avif $webp_dir/$hash.webp /png/$hash.png /jpg/$hash.jpg /jpg/$hash.jpeg /svg/$hash.svg /$hash.gif /$hash.ico /webp/$hash.webp =404;
}
```

Both servers inspect `Accept`: AVIF and WebP variants require an explicit supported format with nonzero `q`. nginx maps it to `$avif_dir` and `$webp_dir`; Apache uses rewrite conditions. The server then tries the original. A WebP-only original also works without `Accept`. Responses include `Vary: Accept`.

### 3. Flat addresses

The engine stores the hierarchical path `/how/bemjson` on disk as `how_bemjson.html`. On request, the server converts the path into a flat filename:

```nginx
# /a/b/c → a_b_c.html (on request, up to 5 levels)
```

The address stays cleanly hierarchical while the file layout stays flat.

Page routes must not occupy the technical namespace: static file extensions (`html`, `css`, `js`, `svg`, `xml`, `jpg`, `jpeg`, `png`, `gif`, `ico`, `avif`, `webp`, `pdf`, `zip`, `ini`, `mp4`), `/brotli` and `/gzip` with descendants, legacy `/_c<hex>`, `/_j<hex>`, `/_s<hex>`, `/_i<hex>`, `/robots.txt`, `/manifest.json`, `/__nuckty_404`, and the exact artifact directory roots `/html`, `/css`, `/js`, `/svg`, `/xml`, `/png`, `/jpg`, `/webp`, `/avif`. The build rejects them before emitting any [HTML](html.md) page. Other dotted routes, such as `/release/1.0.0`, are supported. A query mentioning `.html` does not trigger the Apache direct-file restriction.

### 4. Caching

Assets with hashed names receive a long cache lifetime of 10 years:

```
Cache-Control: public, immutable
Expires: +10 years
```

HTML is served with `public, no-cache`: caches may store it, but must revalidate it before reuse. The `Vary: Accept-Encoding` header makes intermediate caches account for the chosen codec.

### 5. Security headers

Basic security headers on HTML responses:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

The same headers apply to the custom HTML 404 page, including its compressed representations.

These headers cover specific browser protections; they do not replace a site-specific security policy.

## Where everything lands

```
site/ (outDir, deployed)
├── html/, css/, js/, avif/, webp/, png/, jpg/, svg/
├── brotli/, gzip/
├── .htaccess          ← travels with the artifact to shared hosting
└── manifest.json

.build/ (buildDir, internal)
└── nginx.conf         ← generated nginx configuration; not needed on shared hosting
```

Apache reads `.htaccess` from `outDir`. `nginx.conf` is separate in `buildDir`; the preview extension generates its own `.build/nginx-serve.conf` and does not automatically use hooks that changed the build file.

A public `.txt` file emitted by an extension is served as `text/plain`, using its accepted Brotli or Gzip copy when available. Nested text files use the flat compressed basename; colliding basenames fail during compression. `robots.txt` remains uncompressed. If no text artifact occupies a dotted page address, its HTML page still uses ordinary page routing.

## What is not there yet

The configuration handles the technical side of delivery: content negotiation, caching, security. Redirects like `Redirect 301 /old /new` are not part of it — they are added through the `after` hook of the `htaccess` and `nginx` stages (see [pipeline extensions](../how/ext/pipeline.md)). This is deliberate: redirects are the site's job, not the engine's.

