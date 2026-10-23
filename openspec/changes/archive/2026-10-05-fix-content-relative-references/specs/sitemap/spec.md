## MODIFIED Requirements

### Requirement: sitemap.yml line format
Each declared sitemap entry SHALL have the form Title [address, file.md, { layout: "name" }]. The title SHALL supply the navigation name and page title data. Optional layout metadata SHALL be passed to the consumer document handler. A malformed declared entry or invalid metadata SHALL fail sitemap generation instead of being skipped with a warning. The indentation format SHALL not be treated as full YAML; quotes around an entire entry SHALL be rejected.

#### Scenario: A line declares one page
- **WHEN** an entry reads Home [/, index.md, { layout: "landing" }]
- **THEN** the engine reads index.md for address /
- **AND** page.layout is landing for the consumer handler to interpret

#### Scenario: A malformed entry cannot produce a successful incomplete build
- **WHEN** a leaf or parent entry does not match the supported line format or contains invalid metadata
- **THEN** sitemap generation fails with the offending entry in its diagnostic
- **AND** children of a malformed parent are not silently discarded

### Requirement: Page layout is set at the sitemap level
A site MAY give per-page layout metadata in its sitemap entry. The engine SHALL pass that value as page.layout without selecting a layout block or supplying a default page template. The registered document handler SHALL decide how to interpret the metadata. The engine SHALL not read layout from Markdown front matter.

#### Scenario: Rare page overrides the layout
- **WHEN** one sitemap entry has layout landing and another omits layout
- **THEN** the first page receives that metadata and the second has no inferred layout
- **AND** rendered markup is determined by the registered document handler and templates

