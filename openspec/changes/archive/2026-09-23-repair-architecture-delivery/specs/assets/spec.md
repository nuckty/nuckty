## MODIFIED Requirements

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
