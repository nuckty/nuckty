## REMOVED Requirements

### Requirement: props is a template-only channel
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: props data and explicit template output
`props` SHALL carry data for templates and SHALL NOT be serialized automatically. A template MAY read `n.props` and expose its values through content or attributes. The field SHALL NOT be described as a secrecy boundary. Its values MAY include non-JSON objects such as `Map`; callers own any serialization of those values.

#### Scenario: props is not serialized automatically
- **WHEN** a node has `props: { type: 'submit' }` and no attr derived from it
- **THEN** the rendered HTML contains no trace of `props`
- **AND** a template may read `n.props.type` to compute an attribute

## MODIFIED Requirements

### Requirement: BEMTree node fields
The node type SHALL be `BemNode`, with optional typed fields `block`, `elem`, `mods`, `elemMods`, `mix`, `content`, `tag`, `attrs`, `cls`, `js`, `bem`, `props`, `raw` and `tightList`. `BEMTree` SHALL include a node, text, recursively nested arrays and empty `null`/`undefined`/`false` positions.

#### Scenario: A node carries typed fields
- **WHEN** TypeScript type-checks a node explicitly typed as BemNode
- **THEN** the compiler checks each field against `BemNode`
- **AND** the build loader itself only transpiles TypeScript and does not replace that check
