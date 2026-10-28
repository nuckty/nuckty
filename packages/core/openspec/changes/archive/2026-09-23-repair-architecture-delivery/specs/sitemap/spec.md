## MODIFIED Requirements

### Requirement: Content path in a line
The `file.md` token SHALL be resolved relative to the first content level of the selected target's `config/levels.json`, or `content/` when levels are absent. A content level MAY be local or a prepared `external/<repo>/` directory; the build SHALL not clone it.

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
