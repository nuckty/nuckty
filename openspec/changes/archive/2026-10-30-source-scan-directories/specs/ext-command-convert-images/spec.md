## MODIFIED Requirements

### Requirement: convert-images command
The extension SHALL provide `nuckty convert-images <contentDir> [--dry-run] [--force]`; the content directory SHALL be required. The scan SHALL skip hidden directories and `node_modules`. It SHALL validate cache and output-name collisions before encoding. Dry-run SHALL never create, replace or remove files, including on failure. Encoding SHALL use owned temporary siblings and replace a final file only after successful encoding; failure SHALL preserve previous valid variants.

#### Scenario: Command encodes source images
- **WHEN** encoding or cache validation fails with previous variants present
- **THEN** prior valid variants remain unchanged
- **AND** dry-run leaves the entire content directory unchanged

#### Scenario: The scan root is explicit
- **WHEN** `nuckty convert-images` runs without a directory
- **THEN** it fails without reading or writing images
- **AND** images under `node_modules` or a hidden directory of the given root are never converted
