# packages Specification

## Purpose
Define official npm package ownership and naming while preserving the executable and allowing third-party extensions in independent namespaces.

## Requirements

### Requirement: Official scoped packages
The engine SHALL use npm package name `@nuckty/core`, official extensions SHALL use `@nuckty/ext-<type>-<name>`, and the engine SHALL retain executable name `nuckty`. Official packages SHALL live in the monorepository workspace.

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

### Requirement: Workspace demo and registry website
The demo SHALL build from monorepository workspace packages. The website and downloaded starters SHALL use exact published npm dependencies.

#### Scenario: Release verification
- **WHEN** the public packages are published
- **THEN** an isolated consumer installs all eleven exact versions from the registry and verifies their public entries and build

### Requirement: Synchronized npm releases
Changesets SHALL version all eleven public packages together. A changeset on main SHALL produce a version pull request; after it is merged, the release workflow SHALL publish through npm trusted publishing without a long-lived token, verify the public packages, deploy the workspace demo and update the website for the selected release channel.

#### Scenario: Reviewed package release
- **WHEN** a version pull request is merged
- **THEN** public packages share a version and extension peers match the core
- **AND** registry verification completes before consumer deployment

### Requirement: Bounded public verification availability retries
Registry installation SHALL retry until all published versions are available, with a maximum wait of ten minutes. Failure to verify SHALL prevent demo deployment and the website update.

#### Scenario: Publication propagation delay
- **WHEN** an exact version is temporarily unavailable after publication
- **THEN** verification retries within the bounded interval without republishing
