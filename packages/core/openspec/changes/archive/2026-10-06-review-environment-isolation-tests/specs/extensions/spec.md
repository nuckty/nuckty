## ADDED Requirements

### Requirement: Independent extension environments

Each NucktyEnv instance SHALL retain its own command, document, Markdown, level and pending pipeline registrations.

#### Scenario: Registrations stay with their build environment

- **WHEN** an extension registers behavior in one of two independently created environments
- **THEN** the second environment has no corresponding registration, and registering different behavior there does not change the first environment's observable results
