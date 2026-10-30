# nuckty — markdown (core) spec (1.0.0)

## Purpose

Specify the core Markdown pipeline: CommonMark and supported GFM features, hierarchical anchors, cross-link resolution, image mapping and trusted inline HTML. Typography and gallery, grid or video constructs belong to extensions; generic directive parsing belongs to the core.

## Requirements

### Requirement: remark/unified parser
The core SHALL parse Markdown with remark/unified and bridge mdast to BEMTree through the nu renderer. The parser SHALL not use markdown-it or marked. The page content SHALL reach the document handler as the bridge's BEMTree and SHALL render together with the document; typography is left to an explicitly loaded extension.

#### Scenario: Markdown flows through the renderer
- **WHEN** a Markdown page is built
- **THEN** remark produces mdast and the bridge produces BEMTree for rendering
- **AND** the document handler receives that tree without an implicit typography pass

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

### Requirement: Source-relative cross-document links
Authors MAY write Markdown links to `.md` files as on GitHub. The engine SHALL resolve source-relative paths against the current file relative to the selected content root, independently of that root's directory name. It SHALL map a known document through the sitemap md2url map, preserve queries, and map known heading fragments to their final ids. A missing or ambiguous target SHALL fail the build. Unknown fragments MAY refer to consumer markup and SHALL remain available for final artifact validation. Reciprocal links SHALL NOT be rejected as cycles. Standalone callers MAY supply sourceFile separately from inputPath; existing inputPath-only calls SHALL retain their behavior.

#### Scenario: A Markdown document link resolves to a site URL
- **WHEN** content links to a known `.md` document and heading fragment
- **THEN** the link uses the target page URL and final heading id
- **AND** a missing target document fails rather than producing a guessed URL

#### Scenario: A fragment is not in the Markdown heading map
- **WHEN** a link points at a fragment that may be supplied by consumer markup
- **THEN** the fragment is preserved for final artifact validation rather than rejected as a graph cycle

#### Scenario: Nested links work with any content root
- **WHEN** docs/page.md links to ../other.md under a local, external or custom content root
- **THEN** the output uses the sitemap URL for other.md
- **AND** the query and heading fragment are preserved

#### Scenario: Legacy standalone options remain valid
- **WHEN** a standalone caller supplies inputPath without sourceFile
- **THEN** the existing path resolution behavior is preserved
- **AND** missing and ambiguous targets retain explicit diagnostics

### Requirement: Image references use the shared mapping
Markdown and raw HTML images SHALL use the shared image mapping, resolving source-relative paths against the file relative to its content root. inputPath SHALL remain available to existing callers and extensions. Exact normalized mapping keys SHALL win over basename fallback; ambiguous fallback SHALL fail. Raster families SHALL use /_i<family-hash> and SVG SHALL retain its mapped reference. The same mapping SHALL remain usable by gallery and CSS without requiring sourceFile.

#### Scenario: Image reference is rewritten
- **WHEN** content contains `![Caption](images/tyre.png)` and the mapping has that exact path
- **THEN** the output image has one `src=/_i<family-hash>` reference and the logical alt text
- **AND** CSS for that image uses the same reference

#### Scenario: Relative image in a local content directory
- **WHEN** docs/page.md refers to ../images/logo.png and images/logo.png is mapped
- **THEN** Markdown and raw HTML use the mapped reference
- **AND** custom and external roots produce the same result

#### Scenario: Explicit mapping keys remain authoritative
- **WHEN** an image URL directly names an existing mapping key
- **THEN** that key wins over relative and basename lookup
- **AND** ambiguous bare names fail instead of selecting an unrelated image

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

### Requirement: Literal slug separators
Slug separators SHALL be treated as literal strings, including empty, multi-character, regex-significant, replacement-significant and Unicode values. Empty separators SHALL remove selected boundaries without constructing invalid regexes. Repetition and edge trimming SHALL operate on complete nonempty separator tokens. Existing case policy, slash policy and hierarchical level joining SHALL remain unchanged.

#### Scenario: Empty or multi-character separator
- **WHEN** Markdown is rendered with an empty separator or a separator containing multiple hyphens
- **THEN** headings render without a regex error and use the supplied literal separator within each slug

#### Scenario: Special separator text
- **WHEN** a separator contains regex syntax, dollar replacement syntax or Unicode
- **THEN** its characters remain literal in the resulting slug

### Requirement: Leaf fallback regression evidence
Markdown regression tests SHALL assert visible label preservation for unknown leaf directives and for registered handlers that decline them, rather than merely checking an article wrapper.

#### Scenario: Unknown and declined leaf directive
- **WHEN** a labelled leaf directive has no handler or its handler returns null
- **THEN** tests verify the label remains in rendered content and no directive-specific block is emitted

### Requirement: Raw image HTML character references
Raw img src mapping SHALL decode numeric and named references using HTML attribute semantics before resolving the logical URL. Unmatched original attributes SHALL remain byte-identical. Rewritten URLs SHALL be escaped once and preserve logical query and fragment values.

#### Scenario: Equivalent encoded image filenames
- **WHEN** raw img src uses numeric or named references representing a mapped image filename
- **THEN** each spelling resolves to the same artifact URL

#### Scenario: Ambiguous attribute ampersand
- **WHEN** an unterminated named reference is followed by an alphanumeric character or equals sign
- **THEN** the URL retains its literal attribute meaning

#### Scenario: Unmatched or literal input
- **WHEN** an image has no mapping or appears inside literal content
- **THEN** its authored bytes are preserved

### Requirement: Literal heading text ownership
Heading metadata and generated anchors SHALL retain textual content of inline code and escaped text even when it resembles HTML tags. Actual HTML nodes SHALL not contribute markup to metadata. Numbered-prefix cleanup and explicit terminal IDs SHALL retain their existing behavior.

#### Scenario: Distinct component headings
- **WHEN** headings contain inline-code One and Two in angle brackets
- **THEN** metadata retains those literals and generated anchors remain distinct

#### Scenario: Actual inline HTML
- **WHEN** a heading wraps text in an HTML tag
- **THEN** metadata and anchors contain the visible text, not the markup

### Requirement: Literal code URL prefix ownership
Raw asset rewriting in inline and fenced code SHALL match configured prefixes at the start of a complete URL token. An embedded raw URL inside an unrelated URL query SHALL remain unchanged. Direct owned URLs SHALL retain site-origin rewriting behavior.

#### Scenario: Nested raw URL in code
- **WHEN** a copied command contains an unrelated URL whose query embeds the configured raw URL
- **THEN** the whole unrelated URL remains authored

#### Scenario: Punctuation inside an external code URL
- **WHEN** an unrelated code URL includes a closing parenthesis or apostrophe followed by a nested configured raw URL in its query
- **THEN** the complete external token remains authored rather than rewriting the nested value
- **AND** quoted direct owned URLs retain their full filename and quote delimiters

#### Scenario: Logical inline code precedes HTML escaping
- **WHEN** a configured URL prefix contains a valid ampersand path character
- **THEN** inline and fenced code match the same logical prefix before serialization escaping
- **AND** rewritten code is escaped once without losing its literal text

### Requirement: Directive node form
A directive handler SHALL receive the directive form as `type`: `containerDirective`, `leafDirective` or `textDirective`, so one handler name can treat the forms differently.

#### Scenario: Handler declines an inline form
- **WHEN** a handler returns null for a `textDirective`
- **THEN** the directive falls back to its plain content

### Requirement: Directive child converters
A directive handler SHALL receive a third argument with `inline(children)` and `blocks(children)`, which render mdast children to BEMJSON with the same link, anchor and image resolution as the page's ordinary Markdown. `inline` SHALL reject block nodes with an error naming the node. The converters SHALL be created once per page render. When a handler returns null, headings, generated anchors and the heading stack recorded during its conversions SHALL be restored before the plain-content fallback.

#### Scenario: Handler renders an image child
- **WHEN** a handler calls `convert.inline` with an image node whose file is in the image mapping
- **THEN** the result contains an img node pointing at the hashed file

#### Scenario: Handler converts and then declines
- **WHEN** a handler converts a `## Intro` heading with `convert.blocks` and returns null
- **THEN** the page lists `Intro` once and its anchor is `intro`

### Requirement: Relative download links
A relative Markdown link to a `.pdf`, `.zip` or `.ini` file SHALL resolve against the current source file relative to the consumer root and point to `/<filename>` at the artifact root, with the filename percent-encoded and the query and fragment preserved. When the assets stage selection is known, the resolved source SHALL equal the source the assets stage published under that filename; otherwise the build SHALL fail naming the link, the resolved source and the published owner, if any.

#### Scenario: A download from an external repository
- **WHEN** external/docs/docs/guide.md links to files/tool.zip and the assets stage published tool.zip from external/docs/docs/files/tool.zip
- **THEN** the link points to /tool.zip

#### Scenario: A download the assets stage did not publish
- **WHEN** content/guide.md links to manual.pdf and no external repository provides manual.pdf, or the published manual.pdf comes from another repository
- **THEN** the build fails instead of emitting a link that 404s or serves another file

### Requirement: Heading self-links keep final ids
Anchor resolution SHALL NOT rewrite the self-link the bridge generates inside a heading; that link SHALL point at the heading's own final id. Authored same-page and cross-page fragments SHALL keep resolving through the GitHub-slug map.

#### Scenario: A final id equals another heading's GitHub slug
- **WHEN** a page has `# Intro`, `## Setup` with final id `intro-setup`, and `## Intro Setup`
- **THEN** the self-link of `Setup` points at `#intro-setup`
- **AND** an authored link `#intro-setup` points at the `Intro Setup` heading

### Requirement: Leaf fallback is a paragraph
The plain-content fallback of an unknown or declined leaf directive SHALL render its label as a paragraph, with the same wrapping rules as an ordinary paragraph in that position, including no wrapper inside tight list items.

#### Scenario: A leaf directive between paragraphs
- **WHEN** `::note[Visible label]` without a handler stands between two paragraphs
- **THEN** its label renders as a third paragraph rather than bare text between block elements

### Requirement: Anchors keep every script
Heading anchors SHALL keep letters, combining marks and digits of every script, not only Latin and Cyrillic, so headings in Greek, CJK and accented Latin produce non-empty anchors that keep their letters.

#### Scenario: Non-Latin sibling headings
- **WHEN** a page has `# Guide` followed by `## 概要` and `## 安装`
- **THEN** their anchors are `guide-概要` and `guide-安装` and the build succeeds

### Requirement: Markdown entities carry data
The bridge SHALL emit Markdown content as elements of the `article` block — paragraph, heading, heading-anchor, list, list-item, task, code, code-text, inline-code, blockquote, table, table-head, table-body, table-row, table-cell, link, image, rule, break, strong, emphasis, delete, footnote, footnote-ref and footnote-link — with variants as element modifiers (`heading_level_N`, `list_ordered`, `table-cell_header`) and values such as `href`, `src`, `alt`, `id`, `start`, `align`, `checked` and `lang` in `props`. It SHALL NOT set `tag` or `attrs` on these nodes and SHALL NOT emit interface controls. Every build SHALL register default templates for these entities before the site's templates, so a site declaration for the same entity wins and reaches the default through `next()`.

#### Scenario: A site changes a Markdown tag
- **WHEN** a site declares `block('article').elem('paragraph')({ tag: 'div' })`
- **THEN** Markdown paragraphs render as `<div class=article__paragraph>`

#### Scenario: Default Markdown markup
- **WHEN** a page contains a fenced code block and no site template for `article__code`
- **THEN** it renders as `<pre class=article__code><code>…</code></pre>` without a button
