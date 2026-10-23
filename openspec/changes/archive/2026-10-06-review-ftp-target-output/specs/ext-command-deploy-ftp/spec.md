## ADDED Requirements

### Requirement: FTP target declares valid output
The FTP command SHALL reject missing, non-string and empty selected-target output paths before invoking deployment. It SHALL NOT substitute an implicit site directory. Valid custom paths and first-target default selection SHALL remain supported.

#### Scenario: Malformed target output
- **WHEN** a selected target has an absent, numeric, null or empty outDir
- **THEN** the command returns an error without invoking the FTP implementation

### Requirement: Manifest diff owns filename keys
The public FTP comparison helper SHALL use own dictionary keys for local manifest presence, server sizes and remote hashes. Prototype-like filenames SHALL behave like ordinary filenames; inherited entries SHALL NOT represent files.

#### Scenario: Prototype-like orphan and new file
- **WHEN** constructor or another inherited object name is absent from the own local/server records
- **THEN** orphan deletion and new-file classification remain correct

