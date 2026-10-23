## MODIFIED Requirements

### Requirement: Build context
Stages SHALL receive ctx.cwd, ctx.configDir, ctx.buildDir, ctx.outDir and ctx.store. The shared buildDir SHALL hold intermediates and the last built target’s nginx.conf; preview uses its separate nginx-serve.conf. The outDir SHALL hold the target artifact. The store SHALL carry stage results such as sitemap, images and bundle hashes.

#### Scenario: Context separates build and output dirs
- **WHEN** the hosting finalizers run
- **THEN** it writes `nginx.conf` under `ctx.buildDir` and `.htaccess` under `ctx.outDir`
- **AND** ctx.store carries intermediate values while files are written under the configured directories

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

### Requirement: Pipeline is typed code, not YAML
Stages and hooks SHALL be TypeScript functions using the Stage/BuildContext contract. Static TypeScript checks SHALL verify their declared types; the CLI loader SHALL transpile modules without running those checks. Editors MAY offer ctx field completion. Additional build work SHALL be expressed as extension code using the existing stage and hook APIs.

#### Scenario: A stage is type-checked
- **WHEN** a separate TypeScript check includes a stage value that does not match the `Stage` contract
- **THEN** the TypeScript compiler reports the mismatch
- **AND** `ctx` fields are available with editor completion

### Requirement: before/after/registerStage hooks
The pipeline SHALL expose `before(stage, fn)`, `after(stage, fn)`, and `registerStage(name, fn, { phase })`. These are the main build extension point, reached via `env.pipeline`. Nothing about the pipeline SHALL be hard-wired in npm scripts beyond `nuckty build`.

#### Scenario: An extension registers and hooks stages
- **WHEN** an extension calls `env.pipeline.registerStage('search', fn, { phase: 'emit' })` and `env.pipeline.after('html', fn2)`
- **THEN** `search` runs in the emit phase and `fn2` runs after the `html` stage
- **AND** the consumer did not edit engine source
