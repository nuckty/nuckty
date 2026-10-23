## ADDED Requirements

### Requirement: Declared sitemap source cannot silently disappear
The indentation parser SHALL reject empty list entries and unsupported nonempty lines rather than silently omit potential page declarations. Blank lines, comments and the supported sitemap header SHALL remain accepted. A failure SHALL identify the source line before a partial navigation artifact is accepted.

#### Scenario: A missing dash or empty entry fails the build
- **WHEN** a sitemap source contains an empty dash or a page declaration missing its list marker
- **THEN** parsing reports that offending line rather than returning only the other pages
- **AND** ordinary comments and blank lines still parse

