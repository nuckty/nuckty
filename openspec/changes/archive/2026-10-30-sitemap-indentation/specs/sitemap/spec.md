## ADDED Requirements

### Requirement: Two-space indentation
Sitemap entries SHALL be indented by two spaces per nesting level. An entry indented with a tab or an odd number of spaces SHALL fail sitemap generation with its line number.

#### Scenario: Odd indentation
- **WHEN** an entry is indented by three spaces
- **THEN** the build fails naming that line
