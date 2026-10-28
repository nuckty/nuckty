## ADDED Requirements

### Requirement: Isolated release packaging
Release workflows SHALL build the verified source explicitly before packing with lifecycle scripts disabled. Archive metadata parsing SHALL receive only npm's JSON output, independently of build log formatting.

#### Scenario: Noisy package build
- **WHEN** a package build writes ordinary or ANSI-formatted logs
- **THEN** its release archive is packed after the build without rerunning prepack
- **AND** archive integrity validation parses valid npm JSON metadata

### Requirement: Explicit local release archive
The publisher SHALL pass npm an absolute local archive path so package-spec parsing cannot interpret its release directory as a GitHub repository shorthand.

#### Scenario: Archive in the release artifact directory
- **WHEN** the publisher receives an archive below its release directory
- **THEN** npm resolves that local tarball without requesting a Git repository
