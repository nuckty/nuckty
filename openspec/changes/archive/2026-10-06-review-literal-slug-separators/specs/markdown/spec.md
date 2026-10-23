## ADDED Requirements

### Requirement: Literal slug separators
Slug separators SHALL be treated as literal strings, including empty, multi-character, regex-significant, replacement-significant and Unicode values. Empty separators SHALL remove selected boundaries without constructing invalid regexes. Repetition and edge trimming SHALL operate on complete nonempty separator tokens. Existing case policy, slash policy and hierarchical level joining SHALL remain unchanged.

#### Scenario: Empty or multi-character separator
- **WHEN** Markdown is rendered with an empty separator or a separator containing multiple hyphens
- **THEN** headings render without a regex error and use the supplied literal separator within each slug

#### Scenario: Special separator text
- **WHEN** a separator contains regex syntax, dollar replacement syntax or Unicode
- **THEN** its characters remain literal in the resulting slug
