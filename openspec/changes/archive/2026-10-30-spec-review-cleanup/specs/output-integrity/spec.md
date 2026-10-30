## MODIFIED Requirements

### Requirement: Reachable page routes
The HTML stage SHALL reject page URLs reserved by generated hosting rules or artifact directory roots before writing pages. Ordinary queries SHALL NOT trigger Apache direct HTML denial.

#### Scenario: A page collides with static routing
- **WHEN** a page URL ends in a supported static extension, equals an artifact directory root or a reserved technical URL, is a negotiated image URL `/_i<hex>`, or enters a compression directory
- **THEN** the build fails with that URL before any HTML page is written
- **AND** unreserved dotted routes such as /release/1.0.0 remain valid

#### Scenario: A query mentions an HTML filename
- **WHEN** /?download=guide.html is requested
- **THEN** the root page is served normally
- **AND** a direct path /guide.html is still refused
