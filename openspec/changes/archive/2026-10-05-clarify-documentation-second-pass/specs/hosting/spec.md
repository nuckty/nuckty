## MODIFIED Requirements

### Requirement: Two generated config files
Artifact finalization SHALL generate `.htaccess` under `outDir` before the manifest and `nginx.conf` under `buildDir` after the manifest. Nginx configuration SHALL remain outside the published artifact. Both files SHALL be built programmatically from data without a template engine; the serving extension MAY generate its own project-scoped nginx configuration through the same core generator.

#### Scenario: Configs land in the right dirs
- **WHEN** a build completes
- **THEN** `nginx.conf` is under `buildDir` and `.htaccess` is under `outDir`
- **AND** neither is produced by a templating engine

### Requirement: Compression negotiation
Both configs SHALL map `Accept-Encoding` to a compression directory (`brotli/`, then `gzip/`), serve the copy from it, set the matching `Content-Encoding`, and add `Vary: Accept-Encoding` so intermediate caches respect the chosen codec. Both configs SHALL block direct access to the `brotli/` and `gzip/` directories.

#### Scenario: Config negotiates compression
- **WHEN** a request carries `Accept-Encoding: br`
- **THEN** the config serves the `brotli/` copy with `Content-Encoding: br`
- **AND** responses carry `Vary: Accept-Encoding`
- **AND** a direct request to `/brotli/...` or `/gzip/...` is refused

### Requirement: Image format negotiation
Both configurations SHALL negotiate a logical `/_i<family-hash>` reference by Accept, selecting an available acceptable AVIF, then WebP, then the original representation in its format directory. Explicit quality zero SHALL exclude a representation. This SHALL NOT be described as simply appending .avif or .webp to the requested URI.

#### Scenario: Config negotiates image format
- **WHEN** an image address is requested with `Accept` including AVIF
- **THEN** the config serves the available acceptable AVIF representation, else WebP, else the original

### Requirement: Flat URL mapping
Both configs SHALL map a hierarchical URL to the flat on-disk file name at request time (`/a/b/c` → `a_b_c.html`, up to 5 levels). The URL stays clean and hierarchical while the file layout is flat. The builder enforces the matching invariants:

- Page URLs are in canonical form: no trailing slash, at most 5 path segments.
- Two URLs that flatten to the same file name (`/a/b` vs `/a_b`) are a build
  error reported BEFORE any file is written.

#### Scenario: Hierarchical URL maps to flat file
- **WHEN** `/how/bemjson` is requested
- **THEN** the config serves `how_bemjson.html`
- **AND** the visible URL stays hierarchical

#### Scenario: Colliding URLs fail the build
- **WHEN** the sitemap declares `/a/b` and `/a_b`
- **THEN** the build fails naming both URLs and their shared flat file name
- **AND** no HTML file is written for either page

### Requirement: Security headers
Both configs SHALL add baseline security headers to HTML responses: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

#### Scenario: HTML responses carry security headers
- **WHEN** an HTML page is served
- **THEN** the three baseline security headers are present

