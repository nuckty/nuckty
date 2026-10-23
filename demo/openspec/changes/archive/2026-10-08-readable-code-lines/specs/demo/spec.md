## ADDED Requirements

### Requirement: Readable article code lines
Article and example-source code blocks SHALL soft-wrap long lines within the available width while preserving literal whitespace and the exact copy payload. Example-source panels SHALL provide the same copy control as article code blocks.

#### Scenario: Read a long installation command
- **WHEN** a code line exceeds the article width on phone or desktop
- **THEN** the full line remains readable within the code block
- **AND** copying returns the original text without inserted line breaks
