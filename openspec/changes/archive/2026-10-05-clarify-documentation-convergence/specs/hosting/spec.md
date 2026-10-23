## MODIFIED Requirements

### Requirement: Flat URL mapping
Both configs SHALL map a hierarchical URL to the flat on-disk file name at request time (`/a/b/c` → `a_b_c.html`, up to 5 levels). The URL stays clean and hierarchical while the file layout is flat. The builder enforces the matching invariants:

- Page URLs are in canonical form: no trailing slash, at most 5 path segments.
- Two URLs that flatten to the same file name (`/a/b` vs `/a_b`) are a build error reported BEFORE any file is written.

#### Scenario: Hierarchical URL maps to flat file
- **WHEN** `/how/bemjson` is requested
- **THEN** the config serves `how_bemjson.html`
- **AND** the visible URL stays hierarchical

#### Scenario: Colliding URLs fail the build
- **WHEN** the sitemap declares `/a/b` and `/a_b`
- **THEN** the build fails naming both URLs and their shared flat file name
- **AND** no HTML file is written for either page

### Requirement: Image format negotiation
Both configurations SHALL negotiate a logical `/_i<family-hash>` reference by Accept, selecting an available AVIF or WebP file only for an explicit nonzero format match, in that order, then falling back to the original. The fallback SHALL remain the original file rather than a complete Accept/406 implementation. This SHALL NOT be described as simply appending .avif or .webp to the requested URI.

#### Scenario: Config negotiates image format
- **WHEN** an image address is requested with `Accept` including AVIF
- **THEN** the config serves available AVIF for a nonzero explicit match, else explicitly accepted available WebP, else the original

