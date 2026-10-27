# packages Specification

## Purpose
Define official npm package ownership and naming while preserving the executable and allowing third-party extensions in independent namespaces.

## Requirements

### Requirement: Official scoped packages
The engine SHALL use npm package name `@nuckty/core`, official extensions SHALL use `@nuckty/ext-<type>-<name>`, and the engine SHALL retain executable name `nuckty`. Repository directories SHALL retain their existing names.

#### Scenario: Scoped engine and extension consumer
- **WHEN** a consumer installs `@nuckty/core` and an official scoped extension
- **THEN** imports and extension loading resolve those package names
- **AND** the consumer invokes the `nuckty` executable

### Requirement: Independent third-party namespaces
Consumers SHALL be able to load extensions by their complete npm package names without requiring the official scope or a package-name prefix.

#### Scenario: Third-party scoped extension
- **WHEN** a consumer lists `@author/extension` in its extension configuration
- **THEN** the engine resolves it from the consumer root and invokes its registration entry point

### Requirement: Published browser renderer
The core archive SHALL expose `@nuckty/core/browser` with `Templates`, `render` and `renderToHtml` from the same renderer used by builds. This entry SHALL bundle for browser execution without Node built-ins or unpublished source files.

#### Scenario: Registry consumer bundles a preview
- **WHEN** a website bundles `@nuckty/core/browser` with a browser target
- **THEN** the bundle contains the compiled renderer without Node built-in dependencies
- **AND** its HTML matches the core renderer for the same tree and templates

### Requirement: Registry-only website consumers
The website and demo SHALL install official packages at exact versions from the public npm registry. Their runtime dependencies and delivered starters SHALL NOT use sibling package sources or local package archives as fallbacks. Canonical documentation MAY remain a separately verified content input.

#### Scenario: Clean website or demo build
- **WHEN** a clean consumer installs its checked-in dependency lockfile without sibling package repositories
- **THEN** it builds from the published npm packages and the compiled browser renderer

#### Scenario: Downloaded starter
- **WHEN** a user extracts a starter and installs its exact registry dependencies
- **THEN** the starter builds without sibling package sources or bundled package archives

### Requirement: Explicit automated npm releases
A published GitHub Release SHALL trigger package publication only when its tag is `v<package.json version>` and its commit has successful push CI on main. Prereleases SHALL use npm tag `beta`; stable releases SHALL use `latest`. Publication SHALL use a package-specific GitHub Actions OIDC trusted publisher without a long-lived npm token.

#### Scenario: Reviewed package release
- **WHEN** a maintainer publishes a GitHub Release for a versioned commit with successful main CI
- **THEN** the workflow publishes the tested package archive and verifies its public registry integrity
- **AND** a failed or mismatched release does not dispatch consumer updates

### Requirement: Compatible automatic consumer updates
After verified package publication, website and demo automation SHALL resolve only allowlisted official packages from the selected public npm channel, retain exact versions and lock integrity, and verify compatibility and consumer acceptance before committing dependency updates and deploying through CI.

#### Scenario: Compatible published package update
- **WHEN** a package release yields a compatible official package set
- **THEN** website and demo dependency manifests and locks are updated and verified before deployment

#### Scenario: Incompatible package set
- **WHEN** published package peers do not admit the selected core version
- **THEN** consumers retain their previous dependency commits and deployment
