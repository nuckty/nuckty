## MODIFIED Requirements

### Requirement: Cross-link resolution with cycle detection
Authors MAY write Markdown links to `.md` files as on GitHub. The engine SHALL map a known document path through the sitemap `md2url` map, preserve a query, and map known heading fragments to their final ids. A missing target document SHALL fail the build. An unknown fragment MAY refer to an id contributed by consumer layout or raw HTML, so the engine preserves that fragment for validation against the final consumer artifact. Reciprocal links between pages are ordinary navigation and SHALL NOT be rejected as cycles.

#### Scenario: A Markdown document link resolves to a site URL
- **WHEN** content links to a known `.md` document and heading fragment
- **THEN** the link uses the target page URL and final heading id
- **AND** a missing target document fails rather than producing a guessed URL

#### Scenario: A fragment is not in the Markdown heading map
- **WHEN** a link points at a fragment that may be supplied by consumer markup
- **THEN** the fragment is preserved for final artifact validation rather than rejected as a graph cycle

### Requirement: remark/unified parser
The core SHALL parse Markdown with remark/unified and bridge mdast to BEMTree through the nu renderer. The parser SHALL not use markdown-it or marked. The HTML stage MAY serialize already rendered Markdown content into a trusted `raw` fragment before the consumer document handler builds the outer document; this boundary SHALL preserve literal code content and leave typography to an explicitly loaded extension.

#### Scenario: Markdown flows through the renderer
- **WHEN** a Markdown page is built
- **THEN** remark produces mdast and the bridge produces BEMTree for rendering
- **AND** the outer document receives the rendered content without an implicit typography pass

### Requirement: CommonMark support
The core SHALL map supported CommonMark and GFM constructs through mdast to BEMTree: headings, paragraphs, lists, links, images, tables, task items, deletion, code, blockquotes and thematic breaks. Features beyond that base set, such as typography and site-specific directives, SHALL be registered as extensions.

#### Scenario: Markdown content is preserved
- **WHEN** a page contains a reference link, task item, table and code block
- **THEN** each supported node retains its semantic content in the generated tree or HTML
- **AND** absent optional extensions do not change typography

### Requirement: Image references use the shared mapping
A Markdown image reference SHALL resolve through the shared image mapping to the same logical family URL used by CSS (`/_i<family-hash>` for raster images). Exact normalized paths SHALL win over basename fallback; an ambiguous fallback SHALL fail. The family hash identifies all available prepared representations that hosting negotiates by Accept.

#### Scenario: Image reference is rewritten
- **WHEN** content contains `![Caption](images/tyre.png)` and the mapping has that exact path
- **THEN** the output image has one `src=/_i<family-hash>` reference and the logical alt text
- **AND** CSS for that image uses the same reference

### Requirement: Inline-HTML becomes raw
Inline HTML authored in Markdown SHALL pass as a trusted `raw` fragment and SHALL not be sanitized or HTML-escaped by the BEM serializer. The targeted image-reference pass MAY rewrite a logical `<img src>` to the configured hashed image mapping before document assembly; other literal content and code whitespace SHALL be preserved. A consumer is responsible for validating its final HTML and links.

#### Scenario: Inline content is preserved
- **WHEN** the author supplies an inline span or preformatted code
- **THEN** its literal content survives rendering
- **AND** only declared image references may be rewritten through the shared mapping
