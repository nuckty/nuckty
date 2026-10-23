## MODIFIED Requirements

### Requirement: CommonMark support
The core SHALL map supported CommonMark and GFM constructs through mdast to BEMTree: headings, paragraphs, lists, links, images, tables, task items, deletion, autolinks, code, blockquotes and thematic breaks. Features beyond that base set, such as typography and site-specific directives, SHALL be registered as extensions.

#### Scenario: Markdown content is preserved
- **WHEN** a page contains a reference link, task item, table and code block
- **THEN** each supported node retains its semantic content in the generated tree or HTML
- **AND** absent optional extensions do not change typography

### Requirement: Hierarchical anchors
The engine SHALL assign heading ids by the hierarchical-anchor rule: a nested section's id is composed from its ancestors (`# Шины` → `шины`, `## Зимние` → `шины-зимние`). Cyrillic SHALL be preserved without transliteration or encoding; a trailing dot on numbered headings SHALL be dropped; a slash SHALL be replaced by the separator.

#### Scenario: Nested heading gets a composed id
- **WHEN** `### Шипованные` is nested under `## Зимние` under `# Шины`
- **THEN** its id is `шины-зимние-шипованные`
- **AND** the Cyrillic is kept verbatim in the id

### Requirement: Generic directives are the extension syntax
The core SHALL enable generic-directive parsing (remark-directive): text `:name`, leaf `::name`, and container `:::name`, each with an optional `[label]` and `{attributes}` (`#id`, `.class`, `key=val`). The core SHALL NOT know any specific construct (gallery, callout, grid, video) or typography — these are markdown-extensions that map a directive name to BEMJSON via `env.markdown`. A directive with no registered mapping SHALL fall back to its plain content and SHALL NOT break the build.

#### Scenario: Unknown directive falls back to plain content
- **WHEN** content contains `:::gallery` and no gallery extension is loaded
- **THEN** the engine emits its inner content as ordinary text/BEMJSON without a
  `gallery` block
- **AND** loading the extension maps `:::gallery` to the `gallery` block

