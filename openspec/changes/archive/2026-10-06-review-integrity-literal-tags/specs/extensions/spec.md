## ADDED Requirements

### Requirement: Literal-safe artifact link checks

Artifact link checking SHALL ignore tag-shaped text in comments and raw-text element bodies, retain real opening-element attributes, and tokenize quoted greater-than characters correctly.

#### Scenario: Fake anchor identifier

- **WHEN** a linked ID appears only in a comment or script string
- **THEN** the checker reports a missing anchor

### Requirement: Complete raw-text regions in artifact checks

Link and gallery checkers SHALL treat iframe, xmp, noembed, noframes and plaintext bodies as literal text, in addition to script, style, textarea and title. Raw-text names SHALL match complete tag names. Real opening-tag IDs SHALL remain visible to link checking.

#### Scenario: Raw-text fake ID

- **WHEN** a linked ID appears only inside a raw-text body
- **THEN** link checking reports the missing anchor

#### Scenario: Similar custom tag name

- **WHEN** an ordinary element name starts with a raw-text name followed by a hyphen
- **THEN** its descendant elements remain visible to link checking

