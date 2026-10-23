# nuckty — compression spec (1.0.0)

## Purpose

Specify build-time Brotli Q11 and Gzip 9 copies for selected nonempty artifact files, flat per-codec output directories, a normalized gzip OS header marker and server selection through Accept-Encoding. Not every text file is selected; document structure and codec performance comparisons are separate concerns.

## Requirements

### Requirement: Selected files and per-codec naming
The compression stage SHALL select nonempty `.html`, `.css`, `.js`, `.svg`, `.xml` and `.txt` files and basenames matching `^_[cjis][a-f0-9]{16}$`, excluding `robots.txt` and the compression output directories. It SHALL write Brotli Q11 copies under `brotli/` and Gzip level 9 copies under `gzip/`, using each source basename plus the codec suffix. Duplicate flattened basenames SHALL fail clearly.

#### Scenario: Selected nonempty files have both variants
- **WHEN** a build completes
- **THEN** each selected nonempty file has a `.br` copy under `brotli/` and a `.gz` copy under `gzip/`, keeping the original flat name

### Requirement: Exactly two codecs
The standard artifact SHALL carry Brotli and Gzip copies only. Another codec SHALL require a measured proposal and an explicit artifact/hosting contract change; this specification SHALL NOT assert an unmeasured performance or compatibility comparison.

#### Scenario: No third codec
- **WHEN** a build completes
- **THEN** no `.zst` variant or `zstd/` directory is produced

### Requirement: Deterministic gzip OS byte
The gzip stage SHALL set header byte 9 to `0xFF` (unknown), removing the OS-marker difference between build hosts. Byte-identical compressed output SHALL also require matching input and compatible compressor/runtime versions. A different compressed hash can cause unnecessary uploads; it does not make the manifest internally inconsistent.

#### Scenario: Same source yields identical compressed bytes
- **WHEN** the same source is built on macOS and Linux with matching compressor/runtime versions
- **THEN** the `.gz` files are byte-for-byte identical (OS byte `0xFF`)
- **AND** their manifest hashes match

### Requirement: Filename-based compression selection
Compression SHALL be selected by the supported filenames and extensions, without attempting content-type detection. Ordinary JPEG, PNG, AVIF, WebP, MP4, ZIP and PDF filenames SHALL receive no compressed copies. JSON, robots.txt and empty selected files SHALL also receive none.

#### Scenario: Ordinary binary filenames are excluded
- **WHEN** the artifact contains PNG, AVIF, and PDF files
- **THEN** no `.br`/`.gz` siblings are produced for them
- **AND** selected nonempty files still get both variants

### Requirement: Server negotiates the codec
The generated host config SHALL map `Accept-Encoding` to a compression directory in priority order Brotli then Gzip, serve the copy from that directory, and set the matching `Content-Encoding`. A client with Brotli gets `brotli/<name>.br`, with only Gzip gets `gzip/<name>.gz`, with neither gets the original. The compression directories SHALL NOT be served directly (the host config blocks them).

#### Scenario: nginx serves negotiated compression
- **WHEN** a browser sends `Accept-Encoding: br` for an HTML page
- **THEN** the server serves the `brotli/` copy with `Content-Encoding: br`
- **AND** a Gzip-only client gets the `gzip/` copy
- **AND** a direct request to `/brotli/...` or `/gzip/...` is refused

#### Scenario: Selected public text files can use their copies
- **WHEN** a nonempty `.txt` artifact has prepared Brotli and Gzip copies
- **THEN** both generated server configurations serve its selected representation with the matching encoding
- **AND** the decoded body and text media type are preserved
