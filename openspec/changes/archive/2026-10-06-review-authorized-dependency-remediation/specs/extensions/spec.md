## ADDED Requirements

### Requirement: Verified dependency audit remediation

Maintained package and consumer dependencies SHALL use verified patched versions for confirmed audit findings while retaining their documented CLI, native runtime, lint and specification behavior. Remediation SHALL NOT hide advisories or substitute a narrower behavior contract to obtain a green audit.

#### Scenario: Patched Git command dependency

- **WHEN** the content preparation Git dependency is updated for command-execution advisories
- **THEN** clean/origin/clone/LFS/refusal contracts continue passing meaningful tests and its lockfile audit has no unresolved finding

#### Scenario: Unpatched transitive package

- **WHEN** upstream has no patched release
- **THEN** the review records that fact and verifies an actual compatible remediation rather than ignoring the advisory or claiming success from an unchanged version

### Requirement: Compatible maintained brace traversal repair

A maintained local brace-expansion repair SHALL preserve the published API and ordinary pattern outputs while avoiding call-stack exhaustion on deeply nested patterns within the existing input-length contract. Remediation SHALL use iterative traversal rather than lowering accepted pattern depth solely to pass the audit. Fork provenance, license and the security repair SHALL be explicit.

#### Scenario: Deep supported pattern

- **WHEN** compile, stringify or expand processes a deeply nested pattern below the existing character limit
- **THEN** it completes without a native recursion overflow and ordinary brace outputs remain compatible

