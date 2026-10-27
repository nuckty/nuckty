## ADDED Requirements

### Requirement: Bounded public verification availability retries
Post-publication metadata and archive verification SHALL retry HTTP 503 within its existing bounded polling budget without reissuing npm publication. Authentication errors, integrity mismatches and exhausted budgets SHALL fail the workflow and prevent its consumer callback.

#### Scenario: Registry service unavailable after accepted publication
- **WHEN** a public verification read returns HTTP 503 and a later read succeeds within the budget
- **THEN** the same immutable archive is verified before dispatching consumer updates
- **AND** no package is republished by the verification loop

#### Scenario: Unrecoverable verification failure
- **WHEN** authentication fails, published bytes mismatch, or the availability budget expires
- **THEN** the release workflow fails without a consumer update callback
