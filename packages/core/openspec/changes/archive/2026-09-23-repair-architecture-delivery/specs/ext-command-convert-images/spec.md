## MODIFIED Requirements

### Requirement: convert-images command
The extension SHALL provide `nuckty convert-images [contentDir] [--dry-run] [--force]`. It SHALL validate cache and output-name collisions before encoding. Dry-run SHALL never create, replace or remove files, including on failure. Encoding SHALL use owned temporary siblings and replace a final file only after successful encoding; failure SHALL preserve previous valid variants.

#### Scenario: Command encodes source images
- **WHEN** encoding or cache validation fails with previous variants present
- **THEN** prior valid variants remain unchanged
- **AND** dry-run leaves the entire content directory unchanged

### Requirement: Content-hash cache committed to the repo
The command SHALL cache completed conversion outcomes by source hash, including intentional non-shrinking omissions. A failed partial conversion SHALL remain retryable. A cache hit SHALL additionally require the recorded variants at the current source path, so duplicate hashes in different directories and deleted outputs are handled correctly. Legacy entries without a completion marker SHALL be safely revalidated by encoding once.

#### Scenario: Cache skips unchanged images
- **WHEN** all recorded outputs exist after a completed conversion
- **THEN** unchanged sources are skipped
- **AND** a previous AVIF failure is retried without force rather than reported as a completed cache hit
