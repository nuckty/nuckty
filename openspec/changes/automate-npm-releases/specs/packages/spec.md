## ADDED Requirements

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
