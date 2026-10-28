## ADDED Requirements

### Requirement: Build input preservation
The build SHALL validate all selected target outputs against actual input locations before any cleanup, including custom configuration directories and existing symlink ancestors. Disjoint sibling outputs SHALL remain supported.

#### Scenario: Output aliases an input directory
- **WHEN** a selected output resolves into a configured input directory directly or through an existing ancestor symlink
- **THEN** the build fails before removing any input file

#### Scenario: Outputs are disjoint siblings
- **WHEN** two selected targets write to distinct sibling directories
- **THEN** both outputs remain available after the build

### Requirement: Target configuration snapshot
Each target build SHALL use its own current configuration and content levels consistently throughout all stages, without reusing stale configuration from a previous build.

#### Scenario: Targets have different content roots
- **WHEN** two targets use different configuration directories and content levels
- **THEN** each artifact uses only the inputs selected for that target

#### Scenario: Configuration changes between builds
- **WHEN** a programmatic build is repeated after its configuration changes
- **THEN** the next build uses the updated configuration

### Requirement: Final artifact includes consumer hosting customizations
The build SHALL apply registered consumer hosting customizations after generating the relevant hosting configuration and before computing the final published manifest.

#### Scenario: Consumer adds redirects
- **WHEN** a consumer registers a hosting customization that adds redirects
- **THEN** the generated artifact contains those redirects
- **AND** the manifest records the customized file's final bytes

## MODIFIED Requirements

### Requirement: defineNucktyConfig contract
A consumer SHALL declare the build in `config/config-nuckty.ts` through `defineNucktyConfig({ targets, ext })`. Each target SHALL name `configDir` and `outDir` and MAY specify `lang`, `host`, `group` and consumer-owned `data`. The target's config directory contains `site.json`, `sitemap.yml` and `levels.json`; the first configured level selects the content root, defaulting to `content/` when levels are absent. `ext` names consumer-resolvable packages or local paths. The core SHALL validate nonempty targets and supported paths before cleanup.

#### Scenario: Config declares targets and extensions
- **WHEN** `config-nuckty.ts` exports a target and extensions
- **THEN** the engine builds the selected targets from their own config directories and levels
- **AND** it loads only the declared extensions from the consumer context
