## ADDED Requirements

### Requirement: Progressive navigation and controls
Before client initialization, the consumer SHALL expose ordinary mobile navigation links and a compact section-index entry instead of inactive navigation buttons. Script-dependent controls SHALL become available after their handlers are installed. Enhanced menu focus, Escape and modal behavior SHALL be preserved.

#### Scenario: Scripts do not execute
- **WHEN** page scripts are unavailable or blocked
- **THEN** readers can follow the main navigation and section-index links
- **AND** inactive search, theme and menu buttons are hidden

#### Scenario: Scripts initialize
- **WHEN** navigation handlers are installed
- **THEN** the existing compact mobile menu and sidebar controls work as before

### Requirement: Reflow with enlarged text
The consumer SHALL allow its header groups and headings to reflow with an enlarged base font size. Menu placement and document anchor offsets SHALL follow the actual enhanced header height.

#### Scenario: Double the base font size
- **WHEN** the base font is doubled on a narrow viewport
- **THEN** header text and controls remain available without document overflow

### Requirement: Editor initialization fallback
The demo SHALL show a concise static explanation before the editor initializes and expose its editing controls only after initialization. Static examples SHALL remain available.

#### Scenario: Editor script is unavailable
- **WHEN** the editor does not initialize
- **THEN** an explanation replaces the empty editing controls and preview
