## ADDED Requirements

### Requirement: Installed CLI package version
The CLI SHALL print the installed `@nuckty/core` package manifest version for both `--version` and `-v`, independently of the consumer working directory.

#### Scenario: Versioned package release
- **WHEN** a consumer invokes either version flag after installing a new core release
- **THEN** stdout contains `nuckty <package.json version>` and a newline with exit code zero
