## ADDED Requirements

### Requirement: Explicit snapshot repository names

Snapshot resolve, prepare and verify SHALL accept only own configured repository names and reject unsupported inherited keys before filesystem access or Git runner invocation.

#### Scenario: Prototype-looking repository name

- **WHEN** an operation receives constructor, toString or __proto__ as a repository name
- **THEN** it fails with unsupported-name error before accessing a directory or invoking Git
