## MODIFIED Requirements

### Requirement: Supplies the public config contract
The demo SHALL provide `config/site.json`, `config/sitemap.yml` with a landing page and Markdown, media, playground and output routes, `config/levels.json` (`["content", "blocks"]`), and `config/external.json` (`[]`).

#### Scenario: Config dir carries the contract files
- **WHEN** the demo config dir is inspected
- **THEN** all four files and all five showcase routes are present

### Requirement: Source and result panels
The demo SHALL display actual sample sources beside their rendered Markdown results, with keyboard-operable tabs.

#### Scenario: Inspect a sample
- **WHEN** a visitor selects the source tab
- **THEN** the exact sample input is visible and the result panel is hidden

### Requirement: Live renderer
The demo SHALL use the real engine to render editable BEMJSON and show resolved BEMJSON, minimal HTML and a sandboxed preview. Invalid JSON SHALL display an error that clears when input becomes valid.

#### Scenario: Edit a tree
- **WHEN** valid BEMJSON changes
- **THEN** the engine updates the output and preview in the browser

