## REMOVED Requirements

### Requirement: Content-hash cache committed to the repo
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Content-hash conversion cache
The command SHALL write convert-images.json but SHALL NOT perform a version-control commit. It SHALL cache completed conversion outcomes by source hash, including intentional non-shrinking omissions. A failed partial conversion SHALL remain retryable. A cache hit SHALL additionally require the recorded variants at the current source path, so duplicate hashes in different directories and deleted outputs are handled correctly. Legacy entries without a completion marker SHALL be safely revalidated by encoding once.

#### Scenario: Cache skips unchanged images
- **WHEN** all recorded outputs exist after a completed conversion
- **THEN** unchanged sources are skipped
- **AND** a previous AVIF failure is retried without force rather than reported as a completed cache hit

