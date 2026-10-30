# nuckty — pipeline spec (1.0.0)

## Purpose

Specify the programmatic build pipeline: fixed phases, named stages within phases, `before`/`after`/`registerStage` hooks, and the build context stages share. The pipeline is code, not declarative config. Extensions add stages and named hooks while retaining the fixed phase order and unique core stage names.

## Requirements

### Requirement: Fixed phase order
The pipeline SHALL run phases clean, prepare, render, resolve and emit in that fixed order. Clean clears build intermediates and the output while preserving preview-owned runtime files. Prepare copies images and assets. Render builds the sitemap, Markdown trees and CSS/JS bundles. Resolve is currently a reserved no-op stage. Emit writes HTML and extension outputs. After all emit stages, finalizers SHALL run in order compression, htaccess, manifest, nginx; extension files emitted before finalization SHALL be available to compression and the manifest.

#### Scenario: Phases execute in order
- **WHEN** a build runs
- **THEN** phases execute as `clean`, `prepare`, `render`, `resolve`, `emit`
- **AND** the finalization pass (compression, htaccess, manifest, nginx) runs after every emit stage, including extension emit stages
- **AND** the order cannot be changed by a stage or hook

### Requirement: Named stages
A stage SHALL be a named function `(ctx: BuildContext) => void | Promise<void>` assigned to a phase. Core stages SHALL be clean (clean), images/assets (prepare), sitemap/css/js (render), resolve (resolve placeholder), and html (emit). Compression, htaccess, manifest and nginx SHALL be finalizers after the phases. Names SHALL be unique; re-registering a core stage name SHALL fail rather than replace it. Stages SHALL communicate through the shared context and respect upstream data dependencies.

#### Scenario: A core stage reads and writes the store
- **WHEN** the `sitemap` stage runs
- **THEN** it parses `sitemap.yml`, processes Markdown, and writes the address map into the store for later stages to read
- **AND** it does not invoke other stages directly

### Requirement: before/after/registerStage hooks
The pipeline SHALL expose `before(stage, fn)`, `after(stage, fn)`, and `registerStage(name, fn, { phase })`. These are the main build extension point, reached via `env.pipeline`. Nothing about the pipeline SHALL be hard-wired in npm scripts beyond `nuckty build`.

#### Scenario: An extension registers and hooks stages
- **WHEN** an extension calls `env.pipeline.registerStage('search', fn, { phase: 'emit' })` and `env.pipeline.after('html', fn2)`
- **THEN** `search` runs in the emit phase and `fn2` runs after the `html` stage
- **AND** the consumer did not edit engine source

### Requirement: Build context
Stages SHALL receive ctx.cwd, ctx.configDir, ctx.buildDir, ctx.outDir and ctx.store. The shared buildDir SHALL hold intermediates and the last built target’s nginx.conf; previews keep their own configuration under `serve/<target>/`. The outDir SHALL hold the target artifact. The store SHALL carry stage results such as sitemap, images and bundle hashes.

#### Scenario: Context separates build and output dirs
- **WHEN** the hosting finalizers run
- **THEN** it writes `nginx.conf` under `ctx.buildDir` and `.htaccess` under `ctx.outDir`
- **AND** ctx.store carries intermediate values while files are written under the configured directories

### Requirement: Pipeline is typed code, not YAML
Stages and hooks SHALL be TypeScript functions using the Stage/BuildContext contract. Static TypeScript checks SHALL verify their declared types; the CLI loader SHALL transpile modules without running those checks. Editors MAY offer ctx field completion. Additional build work SHALL be expressed as extension code using the existing stage and hook APIs.

#### Scenario: A stage is type-checked
- **WHEN** a separate TypeScript check includes a stage value that does not match the `Stage` contract
- **THEN** the TypeScript compiler reports the mismatch
- **AND** `ctx` fields are available with editor completion

### Requirement: Consumer password metadata target ownership
The consumer password-title hook SHALL read its optional source from captured target content configuration. It SHALL preserve unrelated page titles and existing absent or invalid source fallback. Supported source values SHALL be strings or finite nonzero numbers converted to text; unsupported JSON shapes, booleans, missing values and zero SHALL retain the optional fallback.

#### Scenario: Target differs from global content
- **WHEN** the captured target content root differs from global levels
- **THEN** only the captured target password is prepended

#### Scenario: Configuration changes after capture
- **WHEN** target levels change on disk after configuration capture
- **THEN** the hook retains the captured content root

#### Scenario: Unsupported metadata shape
- **WHEN** the JSON password field contains an object, array or boolean
- **THEN** the optional page title is unchanged
- **AND** supported string and nonzero numeric values retain their textual prefix

### Requirement: Optional password source realpath ownership
The password-title hook SHALL not read a password source resolving outside its captured content root. It SHALL preserve supported symbolic content roots and aliases to files inside that root. An outside alias SHALL leave the optional title unchanged.

#### Scenario: Outside source alias
- **WHEN** common/password.json points outside the selected content root
- **THEN** its bytes are not read into the public title

#### Scenario: Inside source alias
- **WHEN** common/password.json points to a file inside the real content root
- **THEN** the optional source remains supported
