# nuckty — ext-command-convert-images spec (1.0.0)

## Purpose

Specify `nuckty-ext-command-convert-images`, the command-extension that encodes source images to AVIF and WebP next to the originals, which the build then copies. Encoding runs explicitly when source images change; the command writes variants and a cache; the project decides whether to version them. The core does not depend on sharp.

## Requirements

### Requirement: convert-images command
The extension SHALL provide `nuckty convert-images [contentDir] [--dry-run] [--force]`. It SHALL validate cache and output-name collisions before encoding. Dry-run SHALL never create, replace or remove files, including on failure. Encoding SHALL use owned temporary siblings and replace a final file only after successful encoding; failure SHALL preserve previous valid variants.

#### Scenario: Command encodes source images
- **WHEN** encoding or cache validation fails with previous variants present
- **THEN** prior valid variants remain unchanged
- **AND** dry-run leaves the entire content directory unchanged

### Requirement: Quality chosen to beat the original
Quality SHALL be picked iteratively: the codec tries a starting value and lowers it until the result is smaller than the original. AVIF is encoded from the original and must be smaller than the corresponding WebP when that WebP is smaller than the original, otherwise smaller than the original; if that cannot be achieved even at minimum quality, AVIF is skipped. A file that only grows from encoding SHALL NOT be written (serve the original instead).

#### Scenario: A non-shrinking variant is skipped
- **WHEN** encoding an image cannot produce a smaller AVIF than the original
- **THEN** the AVIF is skipped
- **AND** the WebP is written only if it is smaller than the original

### Requirement: Content-hash conversion cache
The command SHALL write convert-images.json but SHALL NOT perform a version-control commit. It SHALL cache completed conversion outcomes by source hash, including intentional non-shrinking omissions. A failed partial conversion SHALL remain retryable. A cache hit SHALL additionally require the recorded variants at the current source path, so duplicate hashes in different directories and deleted outputs are handled correctly. Legacy entries without a completion marker SHALL be safely revalidated by encoding once.

#### Scenario: Cache skips unchanged images
- **WHEN** all recorded outputs exist after a completed conversion
- **THEN** unchanged sources are skipped
- **AND** a previous AVIF failure is retried without force rather than reported as a completed cache hit

### Requirement: Scan result identity regression
Image scanner tests SHALL associate each detected kind with its file path rather than depend on filesystem enumeration order.

#### Scenario: Mixed formats
- **WHEN** a directory contains a PNG and a JPEG
- **THEN** the test verifies both path-to-kind associations regardless of their array order

### Requirement: Cached variants are nonempty files
Completed conversion cache SHALL authorize skipping only when each recorded variant exists as a nonempty regular file. A stale empty file SHALL be regenerated. A directory at an output path SHALL NOT count as cached success; failed replacement SHALL preserve the directory and original image.

#### Scenario: Cached directory
- **WHEN** a completed cache points to a directory instead of WebP
- **THEN** conversion does not report a cached success and leaves original/directory data intact on replacement failure

#### Scenario: Cached empty output
- **WHEN** a recorded variant is an empty file
- **THEN** conversion regenerates the variant

