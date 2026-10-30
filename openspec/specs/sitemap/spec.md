# nuckty — sitemap spec (1.0.0)

## Purpose

Specify the sitemap model: one `config/sitemap.yml` declares the whole site as an explicit tree — addresses, titles, page layout, and navigation. Nesting defines the URL hierarchy. This is the single source of truth; there is no file-as-route inference and no separate navigation file.

## Requirements

### Requirement: sitemap.yml line format
Each declared sitemap entry SHALL have the form Title [address, file.md, { layout: "name" }]. The title SHALL supply the navigation name and page title data. Optional layout metadata SHALL be passed to the consumer document handler. Known layout and navLabel metadata values SHALL be strings when present. A malformed declared entry or invalid metadata SHALL fail sitemap generation instead of being skipped with a warning. The indentation format SHALL not be treated as full YAML; quotes around an entire entry SHALL be rejected.

#### Scenario: A line declares one page
- **WHEN** an entry reads Home [/, index.md, { layout: "landing" }]
- **THEN** the engine reads index.md for address /
- **AND** page.layout is landing for the consumer handler to interpret

#### Scenario: A malformed entry cannot produce a successful incomplete build
- **WHEN** a leaf or parent entry does not match the supported line format or contains invalid metadata
- **THEN** sitemap generation fails with the offending entry in its diagnostic
- **AND** children of a malformed parent are not silently discarded

### Requirement: Address resolution
The address SHALL be the last URL segment: absolute (leading `/`) is taken as-is; relative is appended to the parent's address.

#### Scenario: Relative and absolute addresses
- **WHEN** a nested line uses a relative address
- **THEN** it is appended to the parent's resolved address
- **AND** an absolute address (leading `/`) is taken as-is

### Requirement: Content path in a line
The `file.md` token SHALL be resolved relative to the first content level of levels.json in the selected target's configDir, or `content/` when levels are absent. A content level MAY be local or a prepared `external/<repo>/` directory; the build SHALL not clone it.

#### Scenario: file.md resolves against the target content root
- **WHEN** a target selects `external/acme-content` as its first level and its sitemap names `docs/intro.md`
- **THEN** the engine reads `external/acme-content/docs/intro.md` for that target

### Requirement: Content root is a configurable directory
The selected target SHALL take its content root from the first level in its own `levels.json`, defaulting to `content/` if that file is absent. Later levels supply or override blocks and assets. The build SHALL read existing content without cloning or fetching it, and shall keep target inputs separate across repeated builds. Sitemap `file.md` paths resolve against this content root.

#### Scenario: Content read from the configured root
- **WHEN** a target's first level is `external/acme-content` and its sitemap names `free/models.md`
- **THEN** it reads `external/acme-content/free/models.md`
- **AND** another target with a different first level reads only its own content
- **AND** the build does not clone or fetch either directory

### Requirement: Nesting defines addresses
Indentation SHALL define the URL hierarchy. A relative child address SHALL be appended to its parent's resolved address. The directory tree and address tree are independent: the content file MAY live anywhere under the selected target's first content level; the final address follows the sitemap.

#### Scenario: Relative child joins the parent address
- **WHEN** `С чего начать [start, how/start.md]` is nested under `Как строить [how, how/index.md]`
- **THEN** the child resolves to `/how/start`
- **AND** its content path resolves under that target's content root

### Requirement: Breadcrumbs and navigation from the tree
The engine SHALL compute breadcrumbs from the address parts during the tree walk; they SHALL NOT be authored by hand. The navigation menu SHALL be the sitemap tree itself — the same walk that builds addresses yields the menu. There SHALL be no separate navigation file.

#### Scenario: Breadcrumbs come for free
- **WHEN** a page at `/how/start` is built
- **THEN** its breadcrumbs are derived from the address parts
- **AND** the navigation menu is the sitemap tree, not a separate file

### Requirement: Page layout is set at the sitemap level
A site MAY give per-page layout metadata in its sitemap entry. The engine SHALL pass that value as page.layout without selecting a layout block or supplying a default page template. The registered document handler SHALL decide how to interpret the metadata. The engine SHALL not read layout from Markdown front matter.

#### Scenario: Rare page overrides the layout
- **WHEN** one sitemap entry has layout landing and another omits layout
- **THEN** the first page receives that metadata and the second has no inferred layout
- **AND** rendered markup is determined by the registered document handler and templates

### Requirement: Declared sitemap source cannot silently disappear
The indentation parser SHALL reject empty list entries and unsupported nonempty lines rather than silently omit potential page declarations. Blank lines, comments and the standalone sitemap header, its explicit empty-list form and an optional trailing comment, SHALL remain accepted. Inline declarations appended to that header SHALL fail rather than disappear. A failure SHALL identify the source line before a partial navigation artifact is accepted.

#### Scenario: A missing dash or empty entry fails the build
- **WHEN** a sitemap source contains an empty dash or a page declaration missing its list marker
- **THEN** parsing reports that offending line rather than returning only the other pages
- **AND** ordinary comments and blank lines still parse

### Requirement: Sitemap line titles and URL ownership
A sitemap title SHALL run up to the last bracketed definition, so titles may contain brackets. Two home-section entries that give one URL different files SHALL fail the build; a cross-section entry SHALL still yield to the page's home-section entry.

#### Scenario: Conflicting entries
- **WHEN** a sitemap lists `Guide [/guide, guide.md]` and `Guide v2 [/guide, guide-v2.md]` in the same section
- **THEN** the build fails naming both files

### Requirement: Source commit time
Each page with a source file SHALL carry `lastUpdated`: the Unix time in seconds of the last Git commit that touched the source, or `null` when the file is untracked or Git is unavailable. The engine SHALL NOT format the value; templates own its presentation. Repeated lookups of one source within a build SHALL query Git once.

#### Scenario: Commit time reaches the document
- **WHEN** a page source was last committed at 2023-01-02T00:00:00Z
- **THEN** the document handler receives `page.lastUpdated` equal to `1672617600`

### Requirement: Two-space indentation
Sitemap entries SHALL be indented by two spaces per nesting level. An entry indented with a tab or an odd number of spaces SHALL fail sitemap generation with its line number.

#### Scenario: Odd indentation
- **WHEN** an entry is indented by three spaces
- **THEN** the build fails naming that line
