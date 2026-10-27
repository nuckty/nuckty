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
