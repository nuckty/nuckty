## ADDED Requirements

### Requirement: Cached variants are nonempty files
Completed conversion cache SHALL authorize skipping only when each recorded variant exists as a nonempty regular file. A stale empty file SHALL be regenerated. A directory at an output path SHALL NOT count as cached success; failed replacement SHALL preserve the directory and original image.

#### Scenario: Cached directory
- **WHEN** a completed cache points to a directory instead of WebP
- **THEN** conversion does not report a cached success and leaves original/directory data intact on replacement failure

#### Scenario: Cached empty output
- **WHEN** a recorded variant is an empty file
- **THEN** conversion regenerates the variant
