## REMOVED Requirements

### Requirement: Only text files are compressed
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

### Requirement: Per-codec directories and naming
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Filename-based compression selection
Compression SHALL be selected by the supported filenames and extensions, without attempting content-type detection. Ordinary JPEG, PNG, AVIF, WebP, MP4, ZIP and PDF filenames SHALL receive no compressed copies. JSON, robots.txt and empty selected files SHALL also receive none.

#### Scenario: Ordinary binary filenames are excluded
- **WHEN** the artifact contains PNG, AVIF, and PDF files
- **THEN** no `.br`/`.gz` siblings are produced for them
- **AND** selected nonempty files still get both variants

### Requirement: Selected files and per-codec naming
The compression stage SHALL select nonempty `.html`, `.css`, `.js`, `.svg`, `.xml` and `.txt` files and basenames matching `^_[cjis][a-f0-9]{16}$`, excluding `robots.txt` and the compression output directories. It SHALL write Brotli Q11 copies under `brotli/` and Gzip level 9 copies under `gzip/`, using each source basename plus the codec suffix. Duplicate flattened basenames SHALL fail clearly.

#### Scenario: Selected nonempty files have both variants
- **WHEN** a build completes
- **THEN** each selected nonempty file has a `.br` copy under `brotli/` and a `.gz` copy under `gzip/`, keeping the original flat name

