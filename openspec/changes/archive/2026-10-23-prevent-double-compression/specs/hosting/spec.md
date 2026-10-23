## ADDED Requirements

### Requirement: Precompressed nginx responses avoid double compression
The generated nginx server SHALL disable dynamic gzip regardless of inherited HTTP settings so precompressed artifacts retain a single matching Content-Encoding.

#### Scenario: Parent HTTP context enables gzip
- **WHEN** global gzip is enabled and a browser accepts gzip, deflate and br
- **THEN** the generated server returns the Brotli artifact with only Content-Encoding br
- **AND** decoding it once reproduces the original HTML or static asset

