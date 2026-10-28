## MODIFIED Requirements

### Requirement: Breadcrumbs and navigation from the tree
The engine SHALL compute breadcrumbs from the address parts during the tree walk; they SHALL NOT be authored by hand. The navigation menu SHALL be the sitemap tree itself — the same walk that builds addresses yields the menu. There SHALL be no separate navigation file.

#### Scenario: Breadcrumbs come for free
- **WHEN** a page at `/how/start` is built
- **THEN** its breadcrumbs are derived from the address parts
- **AND** the navigation menu is the sitemap tree, not a separate file

### Requirement: Content path in a line
The `file.md` token SHALL be resolved relative to the first content level of levels.json in the selected target's configDir, or `content/` when levels are absent. A content level MAY be local or a prepared `external/<repo>/` directory; the build SHALL not clone it.

#### Scenario: file.md resolves against the target content root
- **WHEN** a target selects `external/acme-content` as its first level and its sitemap names `docs/intro.md`
- **THEN** the engine reads `external/acme-content/docs/intro.md` for that target
