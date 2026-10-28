## ADDED Requirements

### Requirement: Registry-only website consumers
The website and demo SHALL install official packages at exact versions from the public npm registry. Their runtime dependencies and delivered starters SHALL NOT use sibling package sources or local package archives as fallbacks. Canonical documentation MAY remain a separately verified content input.

#### Scenario: Clean website or demo build
- **WHEN** a clean consumer installs its checked-in dependency lockfile without sibling package repositories
- **THEN** it builds from the published npm packages and the compiled browser renderer

#### Scenario: Downloaded starter
- **WHEN** a user extracts a starter and installs its exact registry dependencies
- **THEN** the starter builds without sibling package sources or bundled package archives
