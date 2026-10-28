# demo-deployment Specification

## Purpose
Describe verified deployment of the bilingual demo after a monorepo release.

## Requirements

### Requirement: Verified automatic static deployment
The release workflow SHALL deploy only after successful registry verification of a published release and a build from the same workspace commit. Pull requests SHALL not receive deployment credentials or deploy. The server SHALL accept only static artifact files matching both language manifests, reject unsafe archives, switch the language pair atomically, and restore the previous release if local health checks fail.

#### Scenario: Publish main
- **WHEN** the release workflow publishes and verifies packages and builds both demo targets
- **THEN** CI uploads only ready static files and the two language domains serve the new release

#### Scenario: Reject a failed release
- **WHEN** an archive is unsafe, a manifest does not match or a health check fails
- **THEN** deployment fails and the previous release remains active
