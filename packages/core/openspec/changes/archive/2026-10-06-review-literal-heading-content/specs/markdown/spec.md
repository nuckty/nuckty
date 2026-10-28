## ADDED Requirements

### Requirement: Literal heading text ownership
Heading metadata and generated anchors SHALL retain textual content of inline code and escaped text even when it resembles HTML tags. Actual HTML nodes SHALL not contribute markup to metadata. Numbered-prefix cleanup and explicit terminal IDs SHALL retain their existing behavior.

#### Scenario: Distinct component headings
- **WHEN** headings contain inline-code One and Two in angle brackets
- **THEN** metadata retains those literals and generated anchors remain distinct

#### Scenario: Actual inline HTML
- **WHEN** a heading wraps text in an HTML tag
- **THEN** metadata and anchors contain the visible text, not the markup
