## ADDED Requirements

### Requirement: Raw asset URL prefix ownership
Raw-asset href rewriting SHALL require a nonempty configured literal prefix at the start of the URL and preserve the full remaining filename, query and fragment. A matching string inside an unrelated URL SHALL NOT cause rewriting. Empty configured prefixes SHALL leave text and URLs unchanged.

#### Scenario: External URL contains an owned URL as data
- **WHEN** an unrelated external href contains a configured raw URL inside its query or fragment
- **THEN** the external href remains unchanged

#### Scenario: Owned filename contains parentheses
- **WHEN** an href starts with the configured prefix and its filename contains parentheses
- **THEN** the whole filename and URI suffix remain available in the rewritten site-root href

### Requirement: Heading metadata respects inline literals
Custom heading IDs SHALL be recognized only in a terminal plain-text suffix. An ID-shaped string inside inline code, emphasis, a link or raw HTML SHALL remain heading content and SHALL NOT override the generated anchor. Recognized suffixes SHALL be removed consistently from visible content and heading metadata.

#### Scenario: Two headings show the same code example
- **WHEN** distinct headings end with the same inline-code ID-shaped string
- **THEN** their generated anchors remain distinct and both retain their literal code content

#### Scenario: Formatted heading has an explicit suffix
- **WHEN** formatted heading content is followed by a plain-text custom ID suffix
- **THEN** the explicit ID is used and the suffix is absent from visible text and metadata

### Requirement: Raw HTML image token boundaries
Raw image mapping SHALL target actual img src attributes with quoted or unquoted values. It SHALL preserve comments, complete non-image attributes, literal code and HTML raw-text content without treating embedded image-shaped strings as markup. Existing shared image resolution and query/fragment semantics SHALL remain unchanged.

#### Scenario: Unquoted raw image source
- **WHEN** a raw img has an unquoted logical source present in the mapping
- **THEN** its source is rewritten to the mapped reference

#### Scenario: Image-shaped text is literal
- **WHEN** comments, attribute values, scripts, styles or textarea content contain an image-shaped string
- **THEN** that literal content remains unchanged while a subsequent real image is still rewritten

### Requirement: Literal code URL prefix ownership
Raw asset rewriting in inline and fenced code SHALL match configured prefixes at the start of a complete URL token. An embedded raw URL inside an unrelated URL query SHALL remain unchanged. Direct owned URLs SHALL retain site-origin rewriting behavior.

#### Scenario: Nested raw URL in code
- **WHEN** a copied command contains an unrelated URL whose query embeds the configured raw URL
- **THEN** the whole unrelated URL remains authored

