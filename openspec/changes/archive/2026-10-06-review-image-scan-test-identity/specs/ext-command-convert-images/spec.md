## ADDED Requirements

### Requirement: Scan result identity regression
Image scanner tests SHALL associate each detected kind with its file path rather than depend on filesystem enumeration order.

#### Scenario: Mixed formats
- **WHEN** a directory contains a PNG and a JPEG
- **THEN** the test verifies both path-to-kind associations regardless of their array order

