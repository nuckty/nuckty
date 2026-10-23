## REMOVED Requirements

### Requirement: No site payload in the engine repo
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

### Requirement: Page wrapper is the root block
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Consumer-owned document wrapper
The document wrapper SHALL come from a registered consumer-owned `env.document` handler. The standard `nuckty-ext-block-root` extension supplies a `root` block; a consumer MAY register a different handler without that package or block name. The engine SHALL NOT hardcode the wrapper identity.

#### Scenario: Registered handler supplies the wrapper
- **WHEN** a page renders
- **THEN** the wrapper comes from the registered document handler, which MAY use the standard root extension or consumer-owned markup

### Requirement: No consumer payload in the distributed engine
The published engine package SHALL NOT ship a consumer’s blocks, content or built `site/` output. Historical documentation in the source checkout MAY remain and SHALL NOT be mistaken for engine-owned site functionality.

#### Scenario: Package excludes consumer content
- **WHEN** the published engine package is installed
- **THEN** it provides engine code rather than a consumer site’s content, blocks or artifact

## MODIFIED Requirements

### Requirement: build drives the pipeline
`build` SHALL resolve `config/config-nuckty.ts`, load the declared extensions, call each extension's `register(env)`, register the default stages, run the pipeline, and write the built site.

#### Scenario: build drives the pipeline
- **WHEN** `nuckty build` runs in a consumer project
- **THEN** the core reads `config-nuckty.ts`, loads `ext[]`, registers default stages, runs the pipeline, and writes the artifact to each target's `outDir`

