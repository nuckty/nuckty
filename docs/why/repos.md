# Packages and repository

## Decision

Keep nuckty in one monorepository with separate packages and synchronized releases managed by Changesets.

## Context

Sites need different capabilities. A site without [HTML](../out/html.md) validation or FTP publication does not need those dependencies.

## Alternatives

Independent repositories isolate histories but require coordinated changes and releases across repositories. A single package simplifies installation but includes every optional dependency.

## Argument

Separate packages isolate optional dependencies: basic-ftp for FTP, vnu-jar for validation and sharp for image conversion. The shared [extension contract](../how/ext/index.md) lets each package add capabilities while the monorepository coordinates changes.

## Consequences

One commit can change the core and documentation, and one CI verifies the workspace. The website remains an external consumer of documentation and released packages. Changesets versions the public packages together.
