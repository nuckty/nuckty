# nuckty — ext-block-grid spec (1.0.0)

> **Status:** implemented by the `nuckty-ext-block-grid` package (one
> `register(env)`: the `grid` block via `env.levels`, the `:::grid` construct
> via `env.markdown.directive`). A card grid with site-specific item types
> remains a consumer construct.

## Purpose

Specify `nuckty-ext-block-grid`, a package combining a block and a markdown construct: the `:::grid` construct via `env.markdown` and the `grid` block via `env.levels`. It lays content out in a multi-column responsive grid.

## Requirements

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

### Requirement: Overridable like any block
`grid` SHALL be overridable by placing `blocks/grid/grid.nu.ts` on a later level.

#### Scenario: Site overrides the grid block
- **WHEN** a site places its own `grid.nu.ts` on a later level
- **THEN** the site's version wins by level priority

