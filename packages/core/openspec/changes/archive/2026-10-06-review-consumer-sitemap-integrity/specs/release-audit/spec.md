## ADDED Requirements

### Requirement: Consumer XML sitemap integrity
The consumer XML sitemap extension SHALL preserve valid page URL text through XML escaping, derive origin and source paths from the current target snapshot, and bound simultaneous source timestamp queries to eight workers. It SHALL retain sitemap entry order and settle started metadata work before publishing the completed XML. Repeated source paths within the hook SHALL reuse timestamp results.

#### Scenario: Route contains an ampersand
- **WHEN** a supported page route contains an ampersand
- **THEN** the emitted sitemap is well-formed XML and its loc text retains that route

#### Scenario: Targets select distinct origins and content roots
- **WHEN** two targets use different configuration directories and source files
- **THEN** each XML sitemap contains only its own origin and source timestamps
- **AND** changing configuration files after capture does not substitute a different origin or source root

#### Scenario: Many XML entries
- **WHEN** the XML sitemap contains many source-backed entries
- **THEN** at most eight timestamp queries are in flight and all entries retain their source metadata in sitemap order
