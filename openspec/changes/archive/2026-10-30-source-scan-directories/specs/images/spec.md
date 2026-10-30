## ADDED Requirements

### Requirement: Image sources outside tooling directories
The images stage SHALL skip hidden directories and `node_modules` on every level, as the assets stage does.

#### Scenario: Dependency images are not published
- **WHEN** a level contains `node_modules/pkg/x.png` and `.venv/y.png`
- **THEN** neither image appears in the image mapping or the artifact
