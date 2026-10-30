## MODIFIED Requirements

### Requirement: Progressive navigation and controls
Before client initialization, the consumer SHALL expose ordinary mobile navigation links and a compact section-index entry instead of inactive navigation buttons. Script-dependent controls SHALL become available after their handlers are installed. Enhanced menu focus, Escape and modal behavior SHALL be preserved.

#### Scenario: Scripts do not execute
- **WHEN** page scripts are unavailable or blocked
- **THEN** readers can follow the main navigation and section-index links
- **AND** inactive theme and menu buttons are hidden

#### Scenario: Scripts initialize
- **WHEN** navigation handlers are installed
- **THEN** the existing compact mobile menu and sidebar controls work as before
