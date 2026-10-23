## ADDED Requirements

### Requirement: Static syntax highlighting
Static fenced code and source examples SHALL receive semantic token markup at build time using TanStack Highlight, without a browser highlighter. Source text SHALL remain unchanged. Unknown languages SHALL remain plain text. Two themes SHALL use shared markup and CSS without line numbers.

#### Scenario: Read or copy a snippet
- **WHEN** a static snippet is displayed or copied
- **THEN** token colors follow the selected theme and its text remains unchanged

### Requirement: Contrasting neighboring-page background
The neighboring-page area SHALL use a white background and paper-colored arrows in the light theme, with corresponding dark-theme colors.

#### Scenario: Reach neighboring pages
- **WHEN** the light theme is selected
- **THEN** the area is white and arrows match the main page background

