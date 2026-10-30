## MODIFIED Requirements

### Requirement: Content root is a configurable directory
The selected target SHALL take its content root from the first level in its own `levels.json`, defaulting to `content/` if that file is absent. Later levels supply or override blocks and assets. The build SHALL read existing content without cloning or fetching it, and SHALL keep target inputs separate across repeated builds. Sitemap `file.md` paths resolve against this content root.

#### Scenario: Content read from the configured root
- **WHEN** a target's first level is `external/acme-content` and its sitemap names `free/models.md`
- **THEN** it reads `external/acme-content/free/models.md`
- **AND** another target with a different first level reads only its own content
- **AND** the build does not clone or fetch either directory
