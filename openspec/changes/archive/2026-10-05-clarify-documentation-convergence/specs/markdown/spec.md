## REMOVED Requirements

### Requirement: Cross-link resolution with cycle detection
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

### Requirement: Generic directives are the extension syntax
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Generic directives and custom Markdown transforms
The core SHALL enable generic-directive parsing (remark-directive): text `:name`, leaf `::name`, and container `:::name`, each with an optional `[label]` and `{attributes}` (`#id`, `.class`, `key=val`). The core SHALL NOT know any specific construct (gallery, callout, grid, video) or typography — these belong to markdown extensions. Directive handlers MAY map a name to BEMJSON, while other syntax and transforms MAY use `env.markdown.use`. A directive with no registered mapping SHALL fall back to its plain content and SHALL NOT break the build.

#### Scenario: Unknown directive falls back to plain content
- **WHEN** content contains `:::gallery` and no gallery extension is loaded
- **THEN** the engine emits its inner content as ordinary text/BEMJSON without a `gallery` block
- **AND** loading the extension maps `:::gallery` to the `gallery` block

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

