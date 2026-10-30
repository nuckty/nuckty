## MODIFIED Requirements

### Requirement: Selected files and per-codec naming
The compression stage SHALL select nonempty `.html`, `.css`, `.js`, `.svg`, `.xml` and `.txt` files, excluding `robots.txt` and the compression output directories. It SHALL write Brotli Q11 copies under `brotli/` and Gzip level 9 copies under `gzip/`, using each source basename plus the codec suffix. Duplicate flattened basenames SHALL fail clearly.

#### Scenario: Selected nonempty files have both variants
- **WHEN** a build completes
- **THEN** each selected nonempty file has a `.br` copy under `brotli/` and a `.gz` copy under `gzip/`, keeping the original flat name
