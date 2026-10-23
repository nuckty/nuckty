# Align consumer CI security gates

## Why

The package/demo workflows pin actions and audit full lockfiles; all three consumer workflows use moving action tags, default token permissions and checkout credential persistence. Consumer bootstrap installs/builds every dependency without a vulnerability gate, leaving the release path weaker than the family checks.

## What Changes

Pin the same trusted action revisions, set read-only repository permissions and disable checkout credential persistence. Audit each prepared package lockfile after installation and before building; audit the consumer lockfile after installation. Fail the bootstrap on audit errors or low-or-higher vulnerability findings. Preserve deployment conditions and artifact identity. Add synthetic execution-order/failure regressions and workflow source checks.

## Impact

Affected capability: release-audit. Local site bootstrap/workflows/tests only; no workflow dispatch, real private-content reads, deployment or publication. Cache action pin is verified against the official actions/cache release.
