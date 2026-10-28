## ADDED Requirements

### Requirement: CSS URL tokens preserve resource semantics
Image reference rewriting SHALL operate on real CSS URL tokens rather than matching text inside strings or comments. It SHALL resolve decoded URL values through the shared image mapping, support quoted parentheses, CSS escapes and source-extension case, and retain query/fragment suffixes. External and data URLs, non-image URLs and unknown paths SHALL remain unchanged. SVG inlining SHALL likewise operate only on real eligible URL tokens. Unrelated source text SHALL retain its contents.

#### Scenario: Valid filenames resolve to published hashed resources
- **WHEN** block CSS references declared images using a quoted parenthesized filename or uppercase source extension
- **THEN** the emitted CSS points to the correct hashed artifact reference
- **AND** CSS strings containing url-like text remain literal content
- **AND** URL suffixes survive the rewrite

### Requirement: Resource URL whitespace normalization
Image mapping for raw HTML and CSS SHALL normalize surrounding C0/space and embedded ASCII tab/newline URL input before decoding percent escapes. Percent-encoded spaces SHALL retain filename meaning; unmatched authored source SHALL remain unchanged.

#### Scenario: Formatted URL input
- **WHEN** an image URL contains surrounding spaces or ASCII tab/newline characters
- **THEN** it resolves to the same mapped image as the equivalent URL input

#### Scenario: Encoded filename spaces
- **WHEN** spaces are percent-encoded in the image filename
- **THEN** they are retained as filename characters for mapping
