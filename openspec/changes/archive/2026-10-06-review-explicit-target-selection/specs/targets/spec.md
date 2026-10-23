## ADDED Requirements

### Requirement: Explicit target selection
Build setup SHALL distinguish an omitted target from an explicitly supplied name. Only undefined SHALL select all targets; an explicit name SHALL use normal target resolution before output cleanup.

#### Scenario: Unknown empty target
- **WHEN** build receives an empty target name that is not configured
- **THEN** it fails as an unknown target and preserves existing outputs

#### Scenario: Omitted target
- **WHEN** build receives no target value
- **THEN** it retains all-target build behavior
