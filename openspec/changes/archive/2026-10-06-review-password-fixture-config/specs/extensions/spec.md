## ADDED Requirements

### Requirement: Complete password hook synthetic configuration

The synthetic password-hook fixture SHALL supply normal target site configuration and test missing/malformed optional password inputs independently, without unrelated successful-run configuration warnings.

#### Scenario: Normal synthetic configuration

- **WHEN** the password hook tests optional values
- **THEN** site.json exists and missing-password checks remain observable

