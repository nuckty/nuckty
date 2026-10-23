## MODIFIED Requirements

### Requirement: Quality chosen to beat the original
Quality SHALL be picked iteratively: the codec tries a starting value and lowers it until the result is smaller than the original. AVIF is encoded from the original and must be smaller than the corresponding WebP when that WebP is smaller than the original, otherwise smaller than the original; if that cannot be achieved even at minimum quality, AVIF is skipped. A file that only grows from encoding SHALL NOT be written (serve the original instead).

#### Scenario: A non-shrinking variant is skipped
- **WHEN** encoding an image cannot produce a smaller AVIF than the original
- **THEN** the AVIF is skipped
- **AND** the WebP is written only if it is smaller than the original

### Requirement: Content-hash cache committed to the repo
The command SHALL write convert-images.json but SHALL NOT perform a version-control commit. It SHALL cache completed conversion outcomes by source hash, including intentional non-shrinking omissions. A failed partial conversion SHALL remain retryable. A cache hit SHALL additionally require the recorded variants at the current source path, so duplicate hashes in different directories and deleted outputs are handled correctly. Legacy entries without a completion marker SHALL be safely revalidated by encoding once.

#### Scenario: Cache skips unchanged images
- **WHEN** all recorded outputs exist after a completed conversion
- **THEN** unchanged sources are skipped
- **AND** a previous AVIF failure is retried without force rather than reported as a completed cache hit

