## MODIFIED Requirements

### Requirement: remark/unified parser
The core SHALL parse Markdown with remark/unified and bridge mdast to BEMTree through the nu renderer. The parser SHALL not use markdown-it or marked. The page content SHALL reach the document handler as the bridge's BEMTree and SHALL render together with the document; typography is left to an explicitly loaded extension.

#### Scenario: Markdown flows through the renderer
- **WHEN** a Markdown page is built
- **THEN** remark produces mdast and the bridge produces BEMTree for rendering
- **AND** the document handler receives that tree without an implicit typography pass

### Requirement: Inline-HTML becomes raw
Inline HTML authored in Markdown SHALL pass as a trusted `raw` fragment and SHALL not be sanitized or HTML-escaped by the BEM serializer. The bridge MAY rewrite a logical `<img src>` inside such a fragment to the configured hashed image mapping; other literal content and code whitespace SHALL be preserved. Raw fragments SHALL NOT change the paragraph structure around them. A consumer is responsible for validating its final HTML and links.

#### Scenario: Inline content is preserved
- **WHEN** the author supplies an inline span or preformatted code
- **THEN** its literal content survives rendering
- **AND** only declared image references may be rewritten through the shared mapping

#### Scenario: Custom element names do not split paragraphs
- **WHEN** inline HTML uses `pre-view`, `div-widget`, `p-note` or `h1-title` inside a paragraph
- **THEN** the paragraph keeps those inline fragments

### Requirement: Generic directives and custom Markdown transforms
The core SHALL enable generic-directive parsing (remark-directive): text `:name`, leaf `::name`, and container `:::name`, each with an optional `[label]` and `{attributes}` (`#id`, `.class`, `key=val`). The core SHALL NOT know any specific construct (gallery, callout, grid, video) or typography — these belong to markdown extensions. Directive handlers MAY map a name to BEMJSON, node handlers MAY map an mdast node type to BEMJSON, and other syntax and transforms MAY use `env.markdown.use`. A directive with no registered mapping SHALL fall back to its plain content and SHALL NOT break the build.

#### Scenario: Unknown directive falls back to plain content
- **WHEN** content contains `:::gallery` and no gallery extension is loaded
- **THEN** the engine emits its inner content as ordinary text/BEMJSON without a `gallery` block
- **AND** loading the extension maps `:::gallery` to the `gallery` block

## ADDED Requirements

### Requirement: Markdown entities carry data
The bridge SHALL emit Markdown content as elements of the `article` block — paragraph, heading, heading-anchor, list, list-item, task, code, code-text, inline-code, blockquote, table, table-head, table-body, table-row, table-cell, link, image, rule, break, strong, emphasis, delete, footnote, footnote-ref and footnote-link — with variants as element modifiers (`heading_level_N`, `list_ordered`, `table-cell_header`) and values such as `href`, `src`, `alt`, `id`, `start`, `align`, `checked` and `lang` in `props`. It SHALL NOT set `tag` or `attrs` on these nodes and SHALL NOT emit interface controls. Every build SHALL register default templates for these entities before the site's templates, so a site declaration for the same entity wins and reaches the default through `next()`.

#### Scenario: A site changes a Markdown tag
- **WHEN** a site declares `block('article').elem('paragraph')({ tag: 'div' })`
- **THEN** Markdown paragraphs render as `<div class=article__paragraph>`

#### Scenario: Default Markdown markup
- **WHEN** a page contains a fenced code block and no site template for `article__code`
- **THEN** it renders as `<pre class=article__code><code>…</code></pre>` without a button
