## ADDED Requirements

### Requirement: Raw image HTML character references
Raw img src mapping SHALL decode numeric and named references using HTML attribute semantics before resolving the logical URL. Unmatched original attributes SHALL remain byte-identical. Rewritten URLs SHALL be escaped once and preserve logical query and fragment values.

#### Scenario: Equivalent encoded image filenames
- **WHEN** raw img src uses numeric or named references representing a mapped image filename
- **THEN** each spelling resolves to the same artifact URL

#### Scenario: Ambiguous attribute ampersand
- **WHEN** an unterminated named reference is followed by an alphanumeric character or equals sign
- **THEN** the URL retains its literal attribute meaning

#### Scenario: Unmatched or literal input
- **WHEN** an image has no mapping or appears inside literal content
- **THEN** its authored bytes are preserved
