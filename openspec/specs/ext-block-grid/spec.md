# nuckty — ext-block-grid spec (1.0.0)

> **Status:** implemented by the `@nuckty/ext-block-grid` package (one
> `register(env)`: the `grid` block via `env.levels`, the `:::grid` construct
> via `env.markdown.directive`). A card grid with site-specific item types
> remains a consumer construct.

## Purpose

Specify `@nuckty/ext-block-grid`, a package combining a block and a markdown construct: the `:::grid` construct via `env.markdown` and the `grid` block via `env.levels`. It lays content out in a multi-column responsive grid.

## Requirements

### Requirement: Combined block + markdown package
The package SHALL register the grid level and the :::grid directive through one register(env). Each paragraph with text or an image SHALL become one grid item rendered like an ordinary paragraph's inline content: links, emphasis, inline code and images SHALL keep their markup, and images SHALL use the page's image mapping. Unsupported non-paragraph children SHALL fail; an empty container SHALL fall back to ordinary content.

#### Scenario: Construct expands into the grid block
- **WHEN** a `.md` contains a `:::grid` container and the extension is loaded
- **THEN** the construct becomes `grid` BEMJSON with its items as children
- **AND** the block loads by deps; without the extension the directive is unwrapped and its Markdown children render normally

#### Scenario: Image and link in cells
- **WHEN** a `:::grid` contains a paragraph with `![Logo](logo.png)` and a paragraph with `[Docs](/docs)`
- **THEN** the first cell contains an img element with the hashed image file
- **AND** the second cell contains a link to `/docs`

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

### Requirement: Grid directive forms
Only the container form `:::grid` SHALL become a grid. Leaf `::grid` and text `:grid` directives SHALL fall back to their plain content without failing the build.

#### Scenario: Inline grid directive
- **WHEN** a paragraph contains `:grid[text]`
- **THEN** the page builds and shows `text`
