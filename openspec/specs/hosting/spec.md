# nuckty — hosting spec (1.0.0)

## Purpose

Specify the generated nginx configuration outside the artifact and Apache .htaccess inside it. Both implement routing, representation negotiation, caching and headers through data-driven generators. Hosting must provide the required modules and configuration permissions; a build does not configure the server itself.

## Requirements

### Requirement: Two generated config files
Artifact finalization SHALL generate `.htaccess` under `outDir` before the manifest and `nginx.conf` under `buildDir` after the manifest. Nginx configuration SHALL remain outside the published artifact. Both files SHALL be built programmatically from data without a template engine; the serving extension MAY generate its own project-scoped nginx configuration through the same core generator.

#### Scenario: Configs land in the right dirs
- **WHEN** a build completes
- **THEN** `nginx.conf` is under `buildDir` and `.htaccess` is under `outDir`
- **AND** neither is produced by a templating engine

### Requirement: Compression negotiation
Both configs SHALL map `Accept-Encoding` to a compression directory (`brotli/`, then `gzip/`), serve an available explicitly accepted copy from it, set the matching `Content-Encoding`, and add `Vary: Accept-Encoding` so intermediate caches respect the chosen codec. Both configs SHALL block direct access to the `brotli/` and `gzip/` directories.

#### Scenario: Config negotiates compression
- **WHEN** a request carries `Accept-Encoding: br`
- **THEN** the config serves the `brotli/` copy with `Content-Encoding: br`
- **AND** responses carry `Vary: Accept-Encoding`
- **AND** a direct request to `/brotli/...` or `/gzip/...` is refused

#### Scenario: Missing preferred copy retains an accepted fallback
- **WHEN** Brotli and Gzip are explicitly accepted but only the Gzip copy exists
- **THEN** the response serves Gzip with matching Content-Encoding
- **AND** if Gzip has zero quality it serves the original instead

#### Scenario: Public text artifacts retain their media type
- **WHEN** an existing public `.txt` artifact is requested with an accepted codec
- **THEN** the server uses its flat compressed copy when available, with text/plain and Vary: Accept-Encoding
- **AND** a dotted HTML page route without that text artifact remains an HTML response rather than borrowing another file with the same basename

### Requirement: Image format negotiation
Both configurations SHALL negotiate a logical `/_i<family-hash>` reference by Accept, selecting an available AVIF or WebP file only for an explicit nonzero format match, in that order, then falling back to the original. The fallback SHALL remain the original file rather than a complete Accept/406 implementation. This SHALL NOT be described as simply appending .avif or .webp to the requested URI.

#### Scenario: Config negotiates image format
- **WHEN** an image address is requested with `Accept` including AVIF
- **THEN** the config serves available AVIF for a nonzero explicit match, else explicitly accepted available WebP, else the original

### Requirement: Flat URL mapping
Both configs SHALL map a hierarchical URL to the flat on-disk file name at request time (`/a/b/c` → `a_b_c.html`, up to 5 levels). The URL stays clean and hierarchical while the file layout is flat. The builder enforces the matching invariants:

- Page URLs are in canonical form: no trailing slash, at most 5 path segments.
- Two URLs that flatten to the same file name (`/a/b` vs `/a_b`) are a build error reported BEFORE any file is written.

#### Scenario: Hierarchical URL maps to flat file
- **WHEN** `/how/bemjson` is requested
- **THEN** the config serves `how_bemjson.html`
- **AND** the visible URL stays hierarchical

#### Scenario: Colliding URLs fail the build
- **WHEN** the sitemap declares `/a/b` and `/a_b`
- **THEN** the build fails naming both URLs and their shared flat file name
- **AND** no HTML file is written for either page

### Requirement: Caching headers
Both generated configs SHALL serve hashed CSS/JS and logical image references with long-lived immutable caching and HTML with no-cache. Identity and negotiated compressed variants of the same hashed resource SHALL retain that immutable policy. Responses that vary by encoding or image format SHALL carry the relevant Vary header.

#### Scenario: Caching matches asset type
- **WHEN** a hashed asset is served in identity and compressed forms
- **THEN** both forms carry immutable caching
- **AND** an HTML page remains revalidated with no-cache

### Requirement: Security headers
Both configs SHALL add baseline security headers to ordinary and custom error HTML responses: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

#### Scenario: HTML responses carry security headers
- **WHEN** an HTML page is served
- **THEN** the three baseline security headers are present

#### Scenario: Custom HTML error responses retain protection
- **WHEN** a missing or forbidden route returns the custom HTML 404 page in identity, Gzip or Brotli form
- **THEN** the response retains 404 status and the three baseline security headers
- **AND** it retains the existing encoding and no-cache behavior

### Requirement: No content redirects in core
The generated configs SHALL contain technical routing, negotiation, caching and security rules only. Consumer redirects MAY be added through a registered `after('htaccess', ...)` finalization hook after `.htaccess` generation and before the manifest; the core SHALL not embed site-specific redirect destinations.

#### Scenario: Redirects are an extension concern
- **WHEN** a consumer registers a content redirect hook
- **THEN** the final `.htaccess` contains its redirects
- **AND** the manifest hashes that final customized file

### Requirement: Hosting artifact destination ownership
The htaccess writer SHALL reject symbolic-link destinations before writing generated hosting configuration. Files outside the artifact root SHALL remain unchanged. Normal generated hosting output SHALL retain its existing behavior.

#### Scenario: Linked htaccess destination
- **WHEN** outDir/.htaccess is a symbolic link to a file outside output
- **THEN** the stage fails before modifying the linked file

### Requirement: Build hosting config write ownership
The nginx config writer SHALL reject a linked nginx.conf destination before modifying outside bytes. A symbolic build directory selecting an owned real workspace SHALL remain supported.

#### Scenario: Linked nginx configuration
- **WHEN** buildDir/nginx.conf points to an outside file
- **THEN** writing fails and outside bytes are preserved

#### Scenario: Symbolic build workspace
- **WHEN** buildDir points to an owned workspace and nginx.conf is a regular destination
- **THEN** the writer emits configuration in that real workspace

### Requirement: Precompressed nginx responses avoid double compression
The generated nginx server SHALL disable dynamic gzip regardless of inherited HTTP settings so precompressed artifacts retain a single matching Content-Encoding.

#### Scenario: Parent HTTP context enables gzip
- **WHEN** global gzip is enabled and a browser accepts gzip, deflate and br
- **THEN** the generated server returns the Brotli artifact with only Content-Encoding br
- **AND** decoding it once reproduces the original HTML or static asset
