## 1. Implement
- [x] Validate release tags, manifest versions, and successful main-branch CI.
- [x] Publish immutable archives with OIDC and verify public registry integrity.
- [x] Update compatible exact registry dependencies in website and demo after publication.
- [x] Document trusted publisher setup and release operation.

## 2. Verify
- [x] Exercise invalid releases, failed CI, registry mismatch, and consumer compatibility regressions.
- [x] Review final diffs and run affected checks.
- [x] Verify pushed workflows and report the untested real-release boundary.

## Verification boundary

No version was bumped or released for setup verification. The first real GitHub Release must verify the npm OIDC exchange; a new npm trusted publisher expires if it has not published within two days. Local guards, compatible registry consumer updates and no-op updater CI were exercised without publishing a disposable version.
