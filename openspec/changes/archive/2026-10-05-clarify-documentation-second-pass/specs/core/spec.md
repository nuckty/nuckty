## MODIFIED Requirements

### Requirement: Identity
The nuckty package SHALL carry the tagline «All static site generators suck. This one just sucks less.» (derived from mutt's «All mail clients suck. This one just sucks less.») in the `package.json` description and the README. The tagline states nuckty's differentiator: one BEMJSON engine, minimal HTML serialization with separately validated document structure, a fully programmatic pipeline, multi-target builds from one repo, and an ultra-thin core extended only through `register(env)`.

#### Scenario: Differentiator is stated
- **WHEN** the package description and README are read
- **THEN** the tagline is present
- **AND** it frames nuckty as distinct from conventional SSGs

### Requirement: TypeScript + ESM, build-time only
The engine SHALL be authored in TypeScript (strict mode) and compiled to ESM in `dist/`. The consumer installs a built package; it SHALL NOT run from raw source. The engine runs at build time only; there is no browser/runtime requirement. Node >= 24: the engine relies on modern ESM and Node built-ins.

#### Scenario: Consumer installs the built package
- **WHEN** a consumer runs `npm install nuckty`
- **THEN** the package resolves to `dist/` (compiled code under `dist`, plus package metadata, README and license)
- **AND** the bin points at `dist/bin/nuckty.js` and is available through npm scripts or `npx nuckty` after local installation

### Requirement: Minimal core runtime dependencies
Core runtime dependencies SHALL be limited to the Markdown stack (`unified`, `remark-parse`, `remark-gfm`, `remark-directive`, `mdast-util-to-string`) and the asset builders (`esbuild`, `lightningcss`). Image encoding, Git repository preparation, serving, external validation and FTP delivery SHALL belong to separately installed extensions.

#### Scenario: Core runtime dependencies stay minimal
- **WHEN** the core `package.json` is inspected
- **THEN** runtime dependencies are the declared Markdown stack, esbuild and Lightning CSS

### Requirement: Consumption via dependency + CLI
A consumer SHALL declare `nuckty` as a dependency (`file:` or git URL for 1.0.0; semver once published) and invoke builds via the `nuckty` CLI bin. The CLI SHALL resolve the consumer root as `process.cwd()`, never the package install dir. The consumer SHALL NOT vendor engine source.

#### Scenario: Consumer builds via CLI
- **WHEN** a consumer's `package.json` has `"build": "nuckty build"`
- **THEN** `npm run build` reads the consumer's `config/`, blocks, and content
- **AND** writes the built site under the consumer's output dir

### Requirement: Config file set
The global CLI configuration SHALL be `config/config-nuckty.ts`. Each target config directory MAY contain `site.json` (identity, build parameters and bundles), `sitemap.yml` (routes and content), `levels.json` (ordered levels) and `external.json` (external stage inputs). These JSON/YAML names SHALL NOT acquire a `config-` prefix. Missing levels SHALL default to `['content', 'blocks']`.

#### Scenario: Config dir carries the file set
- **WHEN** a consumer config dir is inspected
- **THEN** the global config is `config/config-nuckty.ts`, and target data uses the documented JSON/YAML filenames

### Requirement: No baked-in site identity
The engine SHALL obtain consumer site identity and bundles from target configuration. Neutral fallback values MAY exist; the core SHALL NOT embed a real consumer site’s identity or block set.

#### Scenario: No site identity in the engine
- **WHEN** the engine source is inspected
- **THEN** no real consumer identity or block set is embedded; neutral configuration defaults remain allowed

### Requirement: Engine deliverables
The source repository SHALL provide the pipeline, BEMJSON engine, Markdown bridge, utilities, extension loader, CLI, configuration, tests and development documentation. The published npm package SHALL expose compiled `dist` code, public declarations, README, license and package metadata rather than consumer source or engine tests.

#### Scenario: Engine ships engine pieces only
- **WHEN** the published package contents are listed
- **THEN** compiled engine code and declarations are present with package metadata, README and license
- **AND** source tests and consumer content are not required to run it

### Requirement: No site payload in the engine repo
The published engine package SHALL NOT ship a consumer’s blocks, content or built `site/` output. Historical documentation in the source checkout MAY remain and SHALL NOT be mistaken for engine-owned site functionality.

#### Scenario: Engine has no content directory
- **WHEN** the published engine package is installed
- **THEN** it provides engine code rather than a consumer site’s content, blocks or artifact

### Requirement: Page wrapper is the root block
The document wrapper SHALL come from a registered consumer-owned `env.document` handler. The standard `nuckty-ext-block-root` extension supplies a `root` block; a consumer MAY register a different handler without that package or block name. The engine SHALL NOT hardcode the wrapper identity.

#### Scenario: Rendering requires a consumer root block
- **WHEN** a page renders
- **THEN** the wrapper comes from the registered document handler, which MAY use the standard root extension or consumer-owned markup

### Requirement: Engine tests are neutral
The engine test suite SHALL use neutral fixtures — a synthetic `site.json`, synthetic content, a neutral block set — and SHALL NOT reference any real site's name, URL, repo, or blocks. Tests run via `tsx` through npm scripts and SHALL be silent on success.

#### Scenario: Engine tests carry no site name
- **WHEN** the engine test suite is grepped for a real consumer site name
- **THEN** there are zero matches in test sources and fixtures
- **AND** `npm test` is green and silent on success

### Requirement: Final artifact includes consumer hosting customizations
The build SHALL apply `after('htaccess', ...)` customizations after generating `.htaccess` and before computing the final published manifest. Generated nginx configuration SHALL remain outside the published artifact; its finalization hook does not change a published file’s manifest hash.

#### Scenario: Consumer adds redirects
- **WHEN** a consumer registers a hosting customization that adds redirects
- **THEN** the generated artifact contains those redirects
- **AND** the manifest records the customized file's final bytes

