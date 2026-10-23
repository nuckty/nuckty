## ADDED Requirements

### Requirement: Observable CLI value flag regression
CLI integration tests SHALL verify that separated and equals value flags reach the command handler with their values, through output that depends on the supplied flag.

#### Scenario: Value flag reaches the handler
- **WHEN** a synthetic command receives --name carol or --name=carol
- **THEN** its observed output identifies carol rather than the missing-value fallback

