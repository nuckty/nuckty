## ADDED Requirements

### Requirement: Direct capability entry
The demo landing page SHALL expose the actual editable renderer and actual gallery/grid samples, rather than only links to them. Compact layout SHALL retain readable controls and responsive behavior.

#### Scenario: Try the engine from home
- **WHEN** a visitor edits valid BEMJSON on the landing page
- **THEN** the actual engine updates resolved BEMJSON, HTML and the sandboxed preview

### Requirement: Precise demo instructions
The demo copy SHALL distinguish rendered examples, original source, the public file snapshot and the deployment manifest. It SHALL explain unfamiliar terms before relying on them in instructions.

#### Scenario: Inspect build output
- **WHEN** a visitor opens the output page
- **THEN** the page explains which files are measured and which require local artifact access

