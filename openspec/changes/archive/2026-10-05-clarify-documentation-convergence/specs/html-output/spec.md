## REMOVED Requirements

### Requirement: Block-level element set
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

### Requirement: Whitespace and comments
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Explicit paragraph closing tags
A paragraph SHALL retain its explicit `</p>` before a block-level sibling and at the end of its parent. The serializer SHALL NOT infer paragraph end-tag omission from a block-level element set. This preserves the established output layout while keeping paragraph boundaries explicit.

#### Scenario: Paragraph boundaries remain explicit
- **WHEN** a p is followed by a div, heading, list, table or another block-level sibling
- **THEN** the explicit p closing tag is retained
- **AND** a trailing paragraph also retains its closing tag

### Requirement: Literal whitespace and comments
The serializer SHALL add no indentation or separators between adjacent structural nodes. It SHALL preserve literal whitespace supplied in text and attribute values, including whitespace-only text between elements and meaningful whitespace inside pre/code. Text escaping MAY change the encoded bytes but SHALL preserve the logical text. Trusted raw content, including HTML comments and newlines, SHALL pass through unchanged; the serializer SHALL NOT run a blanket whitespace or comment-removal pass. Document-mode trailing newlines are the explicit exception defined by Document wrapper minimization.

#### Scenario: Literal whitespace is preserved
- **WHEN** adjacent structural nodes and a pre/code block are rendered
- **THEN** the serializer adds no whitespace between the structural nodes
- **AND** explicitly supplied whitespace and the code text, including its trailing newline, are preserved

#### Scenario: Raw comments remain verbatim
- **WHEN** trusted raw content contains an HTML comment or deliberate line breaks
- **THEN** those bytes are emitted unchanged

## MODIFIED Requirements

### Requirement: Attribute quoting
BEMJSON attribute values SHALL carry their logical, unescaped values. The serializer SHALL encode `&`, `"`, `<` and `>` as HTML entities exactly once, preserving their decoded values. Encoded attribute values SHALL use double quotes when empty or containing whitespace, a quote, apostrophe, backtick, equals sign, or a literal angle bracket; otherwise they MAY be emitted unquoted. A comma alone SHALL NOT force quotes. Generated `data-bem` SHALL always use a double-quoted escaped JSON value. BEM classes, mix classes and explicit `cls` SHALL use the same attribute escaping. Names and trusted raw HTML are not a sanitization boundary.

#### Scenario: Quotes are dropped where legal
- **WHEN** an attribute value is a single safe token
- **THEN** it is emitted unquoted
- **AND** a comma alone does not force quoting while an empty value is emitted as `alt=""`

#### Scenario: Quoting follows escaping
- **WHEN** an attribute's logical value is a single quotation mark or angle bracket
- **THEN** the serializer encodes it as an HTML entity before choosing outer quotes
- **AND** the encoded token may be unquoted while retaining its decoded value

#### Scenario: Logical values survive encoding
- **WHEN** an attribute or data-bem string includes `>`, `<`, ampersand or quotation marks
- **THEN** its HTML-decoded value equals the original value without additional attributes
- **AND** parsing the decoded data-bem JSON preserves the original object

#### Scenario: BEM class suppression is explicit
- **WHEN** a node has only mix classes
- **THEN** those classes are emitted
- **AND** setting `bem:false` suppresses BEM and mix classes and data-bem, while preserving explicit `cls`
