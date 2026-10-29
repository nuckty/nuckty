# nuckty — assets spec (1.0.0)

## Purpose

Specify CSS and JS output: bundles built from block dependencies, content-hashed file names for long-lived caching, image-reference rewriting, and the `manifest.json` registry used by manifest-based deploy.

## Requirements

### Requirement: Bundles by dependencies
CSS and JS SHALL be collected from the explicit block declaration of each bundle listed in site.json. Blocks absent from that declaration SHALL NOT contribute assets; rendered page content SHALL NOT add them automatically. All configured bundles SHALL be built for the target. The standard root SHALL include all supplied CSS/JS URLs on each page; page-specific selection MAY be supplied by the consumer document handler or root template.

#### Scenario: Bundle collects deps assets only
- **WHEN** `bundles` lists `docs-layout` and its deps include `menu`
- **THEN** the bundle includes `menu.css`/`menu.js`
- **AND** blocks not in the deps are not bundled

### Requirement: CSS via Lightning CSS
CSS SHALL use Lightning CSS for bundling, vendor processing and minimization. Image URLs SHALL use the shared image mapping. The physical output is `css/<hash>.css`, served at `/<hash>.css`. Both absolute extension levels and relative consumer levels SHALL contribute their declared assets.

#### Scenario: CSS is bundled and image urls rewritten
- **WHEN** a selected block references an image in CSS
- **THEN** the emitted CSS uses the same logical image reference as Markdown
- **AND** the CSS hash describes the emitted bytes

### Requirement: JS via esbuild
JS SHALL use esbuild with IIFE output and the existing es2018 target. The physical output is `js/<hash>.js`, served at `/<hash>.js`. An empty source list MAY produce no bundle; a bundling error SHALL fail the build. Absolute extension levels SHALL be resolved without prefixing the consumer root.

#### Scenario: JS bundle is produced
- **WHEN** an installed extension contributes declared JavaScript
- **THEN** its code is included in the emitted bundle
- **AND** invalid JavaScript fails instead of producing a successful empty bundle

### Requirement: Content-hash naming
CSS and JS output names SHALL use the first 16 hexadecimal characters of the MD5 of their complete emitted bytes. Raster image references SHALL identify the entire representation family as specified by the images contract.

#### Scenario: Name changes with content
- **WHEN** emitted CSS or JS bytes change
- **THEN** the asset filename changes
- **AND** unchanged bytes keep the same filename

### Requirement: manifest.json
The build SHALL write a deterministic `manifest.json` with sorted relative keys and `{ size, hash }` values for all published files except the manifest itself. Hashes SHALL use the complete file bytes, including PDF/ZIP tails. Symlinks and ambiguous normalized keys SHALL be rejected rather than silently omitted or followed outside the artifact.

#### Scenario: Manifest is deterministic
- **WHEN** a same-size binary changes after its first 1024 bytes
- **THEN** its manifest hash changes
- **AND** ordinary filenames including `__proto__` are retained as own entries

### Requirement: Immutable vs revalidate caching
Hashed asset URLs SHALL be served with an immutable long-lived Cache-Control policy for both identity and compressed representations. HTML SHALL retain revalidation through no-cache. Negotiated responses SHALL carry the appropriate Vary header.

#### Scenario: Hashed assets are immutable, HTML revalidates
- **WHEN** identity and compressed forms of a hashed asset are requested
- **THEN** both retain immutable caching
- **AND** HTML responses use no-cache

### Requirement: CSS URL tokens preserve resource semantics
Image reference rewriting SHALL operate on real CSS URL tokens rather than matching text inside strings or comments. It SHALL resolve decoded URL values through the shared image mapping, support quoted parentheses, CSS escapes and source-extension case, and retain query/fragment suffixes. External and data URLs, non-image URLs and unknown paths SHALL remain unchanged. SVG inlining SHALL likewise operate only on real eligible URL tokens. Unrelated source text SHALL retain its contents.

#### Scenario: Valid filenames resolve to published hashed resources
- **WHEN** block CSS references declared images using a quoted parenthesized filename or uppercase source extension
- **THEN** the emitted CSS points to the correct hashed artifact reference
- **AND** CSS strings containing url-like text remain literal content
- **AND** URL suffixes survive the rewrite

### Requirement: External repository directory boundary
Captured external repository configuration SHALL reject empty, dot, dot-dot, backslash-containing or control-character directory names before output cleanup or resource copying. Ordinary repository URLs and absent-list discovery SHALL retain their behavior. Diagnostics SHALL NOT disclose URL credentials or query values.

#### Scenario: Traversal repository name
- **WHEN** external configuration derives dot-dot as a repository directory name
- **THEN** build fails before cleanup and does not publish project-root files

### Requirement: Resource URL whitespace normalization
Image mapping for raw HTML and CSS SHALL normalize surrounding C0/space and embedded ASCII tab/newline URL input before decoding percent escapes. Percent-encoded spaces SHALL retain filename meaning; unmatched authored source SHALL remain unchanged.

#### Scenario: Formatted URL input
- **WHEN** an image URL contains surrounding spaces or ASCII tab/newline characters
- **THEN** it resolves to the same mapped image as the equivalent URL input

#### Scenario: Encoded filename spaces
- **WHEN** spaces are percent-encoded in the image filename
- **THEN** they are retained as filename characters for mapping

### Requirement: External asset discovery skips tooling directories
The assets stage SHALL NOT collect files from hidden directories such as `.git` or `.venv` or from `node_modules` of external repositories.

#### Scenario: Credential file in a hidden directory
- **WHEN** an external repository contains `.venv/db.ini` and `docs/guide.pdf`
- **THEN** only `guide.pdf` is copied to the artifact
