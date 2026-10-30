# Hosting and format negotiation

## Decision

Use logical resource URLs and let nginx or Apache select prepared image and compression variants from request headers. Generate the [hosting configuration](../out/hosting.md) during the build.

## Context

nuckty produces a static artifact for nginx or Apache hosting, including hosting accessed through FTP. Format negotiation must work without a required application server or CDN.

## Alternatives

**`picture` and `source`.** [HTML](../out/html.md) can select image formats explicitly. This is useful when an author needs markup-level control, but repeats format-selection rules for each image.

**A CDN.** A CDN can negotiate and transform resources. It can be used with a nuckty site, but is an additional service rather than a requirement of the build contract.

**Compression on each request.** This avoids storing variants but repeats work that can be performed once for a static artifact.

## Argument

[Raster images](../out/images.md) use a logical URL such as `/_i<hash>`. The build copies the original and any prepared variants; it does not encode AVIF or WebP. The server selects an available format using `Accept` and falls back to the original.

[Compression](../out/compression.md) uses `Accept-Encoding` to select Brotli, Gzip, or the original. The generated rules centralize this strategy rather than placing it in every page's markup.

## Consequences

Apache must have the required modules and permit the generated `.htaccess` directives. The price or category of a hosting service does not establish that compatibility. nginx must be configured to use the generated rules.

`.htaccess` belongs to `outDir`; `nginx.conf` belongs to `.build`. The [preview extension](../ext/command/serve.md) generates its own runtime configuration and does not automatically reproduce consumer hooks or Apache behavior in production.

A new format may require changes to image collection, conversion, and hosting generation. Logical URLs keep page markup stable while the serving contract changes.
