# deployment Specification

## Purpose
TBD - created by archiving change automatic-static-deployment. Update Purpose after archive.

## Requirements

### Requirement: Verified automatic static deployment
CI SHALL deploy only after successful build and tests on main. Pull requests SHALL not receive deployment credentials or deploy. The server SHALL accept only static artifact files matching both language manifests, reject unsafe archives, switch the language pair atomically, and restore the previous release if local health checks fail.

#### Scenario: Publish main
- **WHEN** the main workflow completes all build and verification steps
- **THEN** CI uploads only ready static files and the two language domains serve the new release

#### Scenario: Reject a failed release
- **WHEN** an archive is unsafe, a manifest does not match or a health check fails
- **THEN** deployment fails and the previous release remains active
