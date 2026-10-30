## MODIFIED Requirements

### Requirement: Consumption via dependency + CLI
A consumer SHALL declare `@nuckty/core` as a dependency at a published registry version and invoke builds via the `nuckty` CLI bin. The CLI SHALL resolve the consumer root as `process.cwd()`, never the package install dir. The consumer SHALL NOT vendor engine source.

#### Scenario: Consumer builds via CLI
- **WHEN** a consumer's `package.json` has `"build": "nuckty build"`
- **THEN** `npm run build` reads the consumer's `config/`, blocks, and content
- **AND** writes the built site under the consumer's output dir

### Requirement: Minimal core runtime dependencies
Core runtime dependencies SHALL be limited to the Markdown stack (`unified`, `remark-parse`, `remark-gfm`, `remark-directive`, `mdast-util-to-string`) and the asset builders (`esbuild`, `lightningcss`), with `entities` for standards-complete HTML attribute character-reference decoding and `@types/mdast` so the published declarations resolve. Image encoding, Git repository preparation, serving, external validation and FTP delivery SHALL belong to separately installed extensions.

#### Scenario: Core runtime dependencies stay minimal
- **WHEN** the core `package.json` is inspected
- **THEN** runtime dependencies are the declared Markdown stack, esbuild, Lightning CSS, HTML character-reference decoding and the mdast types

### Requirement: No consumer payload in the distributed engine
The published engine package SHALL NOT ship a consumer’s blocks, content or built `site/` output.

#### Scenario: Package excludes consumer content
- **WHEN** the published engine package is installed
- **THEN** it provides engine code rather than a consumer site’s content, blocks or artifact

### Requirement: Public consumer artifact path checks
The package SHALL export assertArtifactPath for consumer writers. A consumer hook that writes into the artifact SHALL be able to check its destination before reading or writing, rejecting linked files and intermediate directories without modifying outside bytes.

#### Scenario: Linked consumer output
- **WHEN** a consumer hook checks a destination that follows a symbolic link outside the artifact
- **THEN** assertArtifactPath fails before the hook reads or changes that outside file

#### Scenario: Ordinary consumer output
- **WHEN** the destination is an owned regular artifact path
- **THEN** assertArtifactPath accepts it

## REMOVED Requirements

### Requirement: Consumer stylesheet property validation

**Reason**: CSS lint is a property of the demo consumer, not of the core package.

**Migration**: The requirement moves to the demo capability as "Demo stylesheet property validation".
