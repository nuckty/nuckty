## MODIFIED Requirements

### Requirement: Combined block + markdown package
The package SHALL register the grid level and the :::grid directive through one register(env). Each nonempty paragraph SHALL become one grid item containing its flattened text. Inline markup, links and images SHALL NOT be preserved as rendered rich content. Unsupported non-paragraph children SHALL fail; an empty container SHALL fall back to ordinary content.

#### Scenario: Construct expands into the grid block
- **WHEN** a `.md` contains a `:::grid` container and the extension is loaded
- **THEN** the construct becomes `grid` BEMJSON with its items as children
- **AND** the block loads by deps; without the extension the directive is unwrapped and its Markdown children render normally

### Requirement: Multi-column responsive layout
The `grid` block SHALL lay its items out in a multi-column responsive layout via the block's CSS, with no external CSS/JS dependencies.

#### Scenario: Items lay out in columns
- **WHEN** a grid renders several items
- **THEN** they are arranged in a responsive multi-column layout
- **AND** no external CSS/JS library is pulled in

