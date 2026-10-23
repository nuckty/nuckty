## ADDED Requirements

### Requirement: Configured provider names match without case dependence
Provider selection SHALL compare the configured provider name and authored link text without case dependence. A custom provider with mixed-case configuration SHALL behave like the same lowercase configuration. Its src function and iframe serialization SHALL remain unchanged.

#### Scenario: Mixed-case custom provider receives the video ID
- **WHEN** configuration registers PeerTube and Markdown names peertube or PEERTUBE
- **THEN** both links invoke that configured provider with the authored ID
- **AND** both produce an iframe rather than an ordinary link

