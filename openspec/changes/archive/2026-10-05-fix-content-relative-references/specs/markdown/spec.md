## MODIFIED Requirements

### Requirement: Cross-link resolution with cycle detection
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

