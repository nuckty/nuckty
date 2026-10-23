## ADDED Requirements

### Requirement: Consumer stylesheet property validation

The maintained public consumer's CSS lint gate SHALL reject unknown standard property names while accepting CSS custom properties.

#### Scenario: Misspelled border declarations

- **WHEN** a stylesheet declares aborder or aborder-radius instead of a known property
- **THEN** CSS lint reports the unknown declarations instead of passing them silently

