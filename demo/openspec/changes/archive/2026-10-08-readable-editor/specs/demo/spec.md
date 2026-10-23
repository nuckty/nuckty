## ADDED Requirements

### Requirement: Readable initial editor samples
The editor SHALL soft-wrap long JSON lines without changing its value. Its initial selected sample SHALL remain readable without horizontal clipping, with readable fluid type and manual vertical resizing.

#### Scenario: Open a preset
- **WHEN** a preset is selected on phone or desktop
- **THEN** its JSON remains valid and long lines wrap inside the editing field
- **AND** the complete initial sample is available without horizontal scrolling

