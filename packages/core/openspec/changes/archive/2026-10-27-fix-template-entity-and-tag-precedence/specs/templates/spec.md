## ADDED Requirements

### Requirement: Block and element selector domains
A declaration without an element selector SHALL match only block nodes without a nonempty element name. Named and wildcard element selectors SHALL match only their corresponding element nodes. The rule SHALL apply to literal and wildcard block names and to all template modes, including structural modes and predicates.

#### Scenario: Block declarations do not leak into elements
- **WHEN** a block declares tag, content or attributes and its tree contains named elements
- **THEN** the block declaration applies only to the block root
- **AND** element declarations apply independently without block-only guard predicates

### Requirement: Explicit BEMJSON tag precedence
A source node tag other than undefined SHALL take precedence over all template tag declarations, including callback declarations and declarations with modifiers or predicates. False tags SHALL preserve tagless fragments; an empty string SHALL also be retained without changing serializer fallback behavior. Other modes SHALL still apply and the input tree SHALL remain unchanged. An absent or undefined source tag SHALL use the normal tag declaration chain.

#### Scenario: Explicit tags remain authoritative
- **WHEN** a source node provides a tag and a matching template provides a different tag
- **THEN** the source tag is retained in resolved BEMJSON and HTML
- **AND** template tag callbacks are not evaluated
- **AND** other matching modes are evaluated normally

## MODIFIED Requirements

### Requirement: Typed output clearing
Public mode callback types SHALL allow undefined results for output field clearing and allow returning next() when no source value is present. Static authoring types SHALL match runtime field removal without casts. A source tag other than undefined SHALL remain authoritative and SHALL NOT be cleared by a tag callback.

#### Scenario: Typed removal and fallback
- **WHEN** a template callback clears a template-controlled tag or attrs with undefined or returns an absent next value
- **THEN** TypeScript accepts the declaration and runtime omits the resolved field
- **AND** an explicitly supplied source tag is retained without invoking its tag callback
