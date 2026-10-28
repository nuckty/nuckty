## MODIFIED Requirements

### Requirement: Trustworthy release verification
Coverage SHALL retain source line positions and detect unexecuted functions. Release smoke copies SHALL exclude private configs and external symlinks. Public package lockfiles SHALL resolve through the public registry. Preview and VNU CI SHALL require native command integration tests with their respective runtimes. Package and demo CI SHALL audit full lockfiles against the public registry, including development dependencies, and fail on any vulnerability of low or greater severity or an audit error.

#### Scenario: Uncalled function
- **WHEN** coverage measures an imported file containing an uncalled function
- **THEN** its executable body is reported uncovered.

#### Scenario: Private sibling input
- **WHEN** a sibling source contains a private FTP config or a symlink
- **THEN** smoke snapshots do not copy its contents.

#### Scenario: Package source map
- **WHEN** a package ships a source map
- **THEN** each referenced source is embedded or present in the tarball.

#### Scenario: Vulnerable build dependency
- **WHEN** audit reports a vulnerable build-only dependency or fails to obtain a registry response
- **THEN** CI fails instead of treating production-only results as complete.
