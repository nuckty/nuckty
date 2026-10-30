## MODIFIED Requirements

### Requirement: env.markdown.directive(name, map)
`env.markdown.directive(name, map)` SHALL pass the directive’s name, parsed attributes and unconverted mdast children to a handler, together with the page's Markdown options (image mapping, source file, language) and child converters. Label content SHALL be represented by children rather than a separate label property. The handler SHALL return a `BEMTree` or null for ordinary fallback; it SHALL convert child content explicitly rather than assign mdast nodes directly to BEMJSON content. The bridge is mdast → BEMJSON, without a hast hName/hProperties layer.

#### Scenario: Markdown extension maps a directive
- **WHEN** an extension calls `env.markdown.directive('callout', map)`
- **THEN** `:::callout` in any `.md` becomes the `BEMTree` node returned by `map`
- **AND** without it the directive renders as plain content

## ADDED Requirements

### Requirement: env.markdown.node(type, map)
`env.markdown.node(type, map)` SHALL map every mdast node of `type`, including a type inserted by a remark plugin, to the `BEMTree` returned by the handler before the core conversion of that type. The handler receives the node, the page's Markdown options and the child converters; returning null SHALL keep the core conversion. A later registration for a type SHALL replace an earlier one.

#### Scenario: Extension renders code blocks
- **WHEN** an extension maps `code` to a `code` block with highlighted tokens
- **THEN** fenced code renders through the extension's templates
- **AND** returning null for a language keeps the default `article__code` conversion
