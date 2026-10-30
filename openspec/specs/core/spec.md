# nuckty — core spec (1.0.0)

> **Identity.** «All static site generators suck. This one just sucks less.»
> (mutt reference).

## Purpose

Specify the ultra-thin public contract of the nuckty core package: identity, packaging, consumption, configuration, and extension loading. The core knows exactly one command — `nuckty build` — and one extension contract — `register(env)`. Everything else (serve, validate, deploy, blocks, markdown constructs, extra stages) is delivered by extensions and specified in their own capabilities. The engine builds sites; it does not dictate site architecture.

## Requirements

### Requirement: Identity
The nuckty package SHALL carry the tagline «All static site generators suck. This one just sucks less.» (derived from mutt's «All mail clients suck. This one just sucks less.») in the `package.json` description and the README. The tagline states nuckty's differentiator: one BEMJSON engine, minimal HTML serialization with separately validated document structure, a fully programmatic pipeline, multi-target builds from one repo, and an ultra-thin core extended only through `register(env)`.

#### Scenario: Differentiator is stated
- **WHEN** the package description and README are read
- **THEN** the tagline is present
- **AND** it frames nuckty as distinct from conventional SSGs

### Requirement: TypeScript + ESM, build-time only
The engine SHALL be authored in TypeScript (strict mode) and compiled to ESM in `dist/`. The consumer installs a built package; it SHALL NOT run from raw source. The engine runs at build time only; there is no browser/runtime requirement. Node >= 24: the engine relies on modern ESM and Node built-ins.

#### Scenario: Consumer installs the built package
- **WHEN** a consumer runs `npm install @nuckty/core`
- **THEN** the package resolves to `dist/` (compiled code under `dist`, plus package metadata, README and license)
- **AND** the bin points at `dist/bin/nuckty.js` and is available through npm scripts or `npx @nuckty/core` after local installation

### Requirement: Single build subcommand
The core CLI SHALL implement exactly one subcommand: `nuckty build [target]`. The core SHALL NOT know about serve, validate, deploy, image encoding, FTP, or vnu. Any other command is a command-extension (see the `extensions` capability).

#### Scenario: Core exposes only build
- **WHEN** the core CLI is invoked with an unknown subcommand and no extension registered it
- **THEN** the core reports the command is unknown
- **AND** `nuckty build` remains the only command guaranteed by the core

### Requirement: build drives the pipeline
`build` SHALL resolve `config/config-nuckty.ts`, load the declared extensions, call each extension's `register(env)`, register the default stages, run the pipeline, and write the built site.

#### Scenario: build drives the pipeline
- **WHEN** `nuckty build` runs in a consumer project
- **THEN** the core reads `config-nuckty.ts`, loads `ext[]`, registers default stages, runs the pipeline, and writes the artifact to each target's `outDir`

### Requirement: Minimal core runtime dependencies
Core runtime dependencies SHALL be limited to the Markdown stack (`unified`, `remark-parse`, `remark-gfm`, `remark-directive`, `mdast-util-to-string`) and the asset builders (`esbuild`, `lightningcss`), with `entities` for standards-complete HTML attribute character-reference decoding and `@types/mdast` so the published declarations resolve. Image encoding, Git repository preparation, serving, external validation and FTP delivery SHALL belong to separately installed extensions.

#### Scenario: Core runtime dependencies stay minimal
- **WHEN** the core `package.json` is inspected
- **THEN** runtime dependencies are the declared Markdown stack, esbuild, Lightning CSS, HTML character-reference decoding and the mdast types

### Requirement: Consumption via dependency + CLI
A consumer SHALL declare `@nuckty/core` as a dependency at a published registry version and invoke builds via the `nuckty` CLI bin. The CLI SHALL resolve the consumer root as `process.cwd()`, never the package install dir. The consumer SHALL NOT vendor engine source.

#### Scenario: Consumer builds via CLI
- **WHEN** a consumer's `package.json` has `"build": "nuckty build"`
- **THEN** `npm run build` reads the consumer's `config/`, blocks, and content
- **AND** writes the built site under the consumer's output dir

### Requirement: defineNucktyConfig contract
A consumer SHALL declare the build in `config/config-nuckty.ts` through `defineNucktyConfig({ targets, ext })`. Each target SHALL name `configDir` and `outDir` and MAY specify `lang`, `host`, `group` and consumer-owned `data`. The target's config directory contains `site.json`, `sitemap.yml` and `levels.json`; the first configured level selects the content root, defaulting to `content/` when levels are absent. `ext` names consumer-resolvable packages or local paths. The core SHALL validate nonempty targets and supported paths before cleanup.

#### Scenario: Config declares targets and extensions
- **WHEN** `config-nuckty.ts` exports a target and extensions
- **THEN** the engine builds the selected targets from their own config directories and levels
- **AND** it loads only the declared extensions from the consumer context

#### Scenario: Loaded configuration has no targets
- **WHEN** the loaded configuration target set is empty, including after helper creation
- **THEN** build fails before output cleanup instead of succeeding without an artifact

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

### Requirement: No consumer payload in the distributed engine
The published engine package SHALL NOT ship a consumer’s blocks, content or built `site/` output.

#### Scenario: Package excludes consumer content
- **WHEN** the published engine package is installed
- **THEN** it provides engine code rather than a consumer site’s content, blocks or artifact

### Requirement: Consumer-owned document wrapper
The document wrapper SHALL come from a registered consumer-owned `env.document` handler. The standard `@nuckty/ext-block-root` extension supplies a `root` block; a consumer MAY register a different handler without that package or block name. The engine SHALL NOT hardcode the wrapper identity.

#### Scenario: Registered handler supplies the wrapper
- **WHEN** a page renders
- **THEN** the wrapper comes from the registered document handler, which MAY use the standard root extension or consumer-owned markup

### Requirement: Engine tests are neutral
The engine test suite SHALL use neutral fixtures — a synthetic `site.json`, synthetic content, a neutral block set — and SHALL NOT reference any real site's name, URL, repo, or blocks. Tests run via `tsx` through npm scripts and SHALL be silent on success.

#### Scenario: Engine tests carry no site name
- **WHEN** the engine test suite is grepped for a real consumer site name
- **THEN** there are zero matches in test sources and fixtures
- **AND** `npm test` is green and silent on success

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
The build SHALL apply `after('htaccess', ...)` customizations after generating `.htaccess` and before computing the final published manifest. Generated nginx configuration SHALL remain outside the published artifact; its finalization hook does not change a published file’s manifest hash.

#### Scenario: Consumer adds redirects
- **WHEN** a consumer registers a hosting customization that adds redirects
- **THEN** the generated artifact contains those redirects
- **AND** the manifest records the customized file's final bytes

### Requirement: Explicit consumer root for resource stages
Every core build stage SHALL resolve relative configured levels and external repositories against BuildContext.cwd. It SHALL NOT replace that root with an ancestor discovered from package.json. This SHALL apply consistently to images, static files, CSS and JavaScript, including a nested consumer using dependencies installed in a parent package. Standalone directory-discovery helpers SHALL retain their documented behavior.

#### Scenario: Nested consumer excludes parent-shadow resources
- **WHEN** a parent package and nested consumer provide different files under matching relative level and external-repository names
- **THEN** the nested build emits only the consumer’s declared resources
- **AND** adding or removing a consumer package.json does not change resource ownership

### Requirement: SEO artifact ownership
The core SHALL copy a supplied robots.txt from the target configuration directory into the output root. It SHALL NOT invent that file when absent or generate an SEO sitemap.xml. A consumer MAY emit an XML sitemap through a pipeline extension before finalization, allowing the normal compression and manifest stages to process it.

#### Scenario: Consumer supplies robots.txt
- **WHEN** the target configuration directory contains robots.txt
- **THEN** the assets stage copies its bytes unchanged into the output root

#### Scenario: Consumer supplies no SEO artifacts
- **WHEN** robots.txt is absent and no extension emits sitemap.xml
- **THEN** the build creates neither SEO file automatically

### Requirement: Current implementation references
Public API and source documentation SHALL describe the implemented configuration, metadata, artifact ownership and lifecycle boundaries. It SHALL distinguish standalone directory discovery from explicit build roots, first-target command defaults from an all-target build, and read-only preparation plans from commands that read remote state. Historical migration notes SHALL NOT replace the current contract.

#### Scenario: Developer reads implementation documentation
- **WHEN** a developer reads a public type or stage/extension description
- **THEN** its documented inputs, side effects and conditions agree with the current implementation and associated user guide

### Requirement: Public target snapshot access for extensions
The core SHALL export getBuildConfig and BuildConfigSnapshot so a pipeline extension can access the captured target configuration through its BuildContext. The helper SHALL reuse the current context snapshot when present and resolve the explicit context root and configDir when absent. Snapshot fields SHALL include merged site settings, ordered levels, contentDir, contentRelative and externalUrls.

#### Scenario: Extension reads configuration after capture
- **WHEN** an extension calls getBuildConfig(ctx) after target configuration was captured
- **THEN** it receives that target's snapshot instead of rereading changed files or the global configuration

### Requirement: Own bundle dependency keys
Bundle dependency dictionaries SHALL retain every configured bundle as an own enumerable key, including names equal to object prototype properties. These names SHALL NOT alter dictionary prototypes or silently drop resource inputs.

#### Scenario: Prototype-like bundle name
- **WHEN** a declared bundle is named __proto__ and contains real CSS and JavaScript dependencies
- **THEN** both resources are built and retained in their hash maps

### Requirement: Real Markdown source containment
Before reading a Markdown source, the core SHALL require both its lexical path and resolved real path to remain within the selected content root. A symlink outside that root SHALL fail without emitting its content. Explicit symlink content roots and file symlinks remaining inside the resolved root SHALL stay supported. Logical paths SHALL continue to drive source-relative links.

#### Scenario: Source symlink escapes its root
- **WHEN** a sitemap source points through a symlink to a file outside the selected content root
- **THEN** the build fails before reading or emitting that file

#### Scenario: Symlink stays inside the selected root
- **WHEN** an explicit content root is a symlink or a source links to another file within the resolved root
- **THEN** the page is built without treating that permitted alias as an escape

### Requirement: Observable CLI value flag regression
CLI integration tests SHALL verify that separated and equals value flags reach the command handler with their values, through output that depends on the supplied flag.

#### Scenario: Value flag reaches the handler
- **WHEN** a synthetic command receives --name carol or --name=carol
- **THEN** its observed output identifies carol rather than the missing-value fallback

### Requirement: Build metadata path ownership
Core stages SHALL validate build metadata destinations before reading or writing them, reject symbolic-link files and paths escaping the real build workspace, and preserve supported symbolic build roots. This SHALL cover CSS/JS entry files and hashes, image mapping and diagnostic sitemap output.

#### Scenario: Linked metadata file
- **WHEN** a build metadata path links to an outside file
- **THEN** the stage fails before reading or modifying outside bytes

#### Scenario: Owned symbolic workspace
- **WHEN** buildDir selects an owned real workspace through a symbolic link
- **THEN** ordinary metadata generation remains supported

### Requirement: Public consumer artifact path checks
The package SHALL export assertArtifactPath for consumer writers. A consumer hook that writes into the artifact SHALL be able to check its destination before reading or writing, rejecting linked files and intermediate directories without modifying outside bytes.

#### Scenario: Linked consumer output
- **WHEN** a consumer hook checks a destination that follows a symbolic link outside the artifact
- **THEN** assertArtifactPath fails before the hook reads or changes that outside file

#### Scenario: Ordinary consumer output
- **WHEN** the destination is an owned regular artifact path
- **THEN** assertArtifactPath accepts it

### Requirement: Image family source realpath ownership
Image originals and prepared variant reads SHALL remain inside the real source level selected for that image. Outside aliases SHALL fail before reading or publishing their bytes. Symbolic source roots and aliases to variants inside that real root SHALL remain supported.

#### Scenario: Outside variant alias
- **WHEN** a WebP or AVIF sibling resolves outside its selected image level
- **THEN** the stage fails before reading that file and publishing the image family

#### Scenario: Inside variant alias
- **WHEN** a symbolic source root contains a variant alias to another file within its real root
- **THEN** the representation remains supported

### Requirement: External source entries
The core SHALL read `external.json` entries as repository URL strings or objects `{ url, ref?, path? }`, map both forms to `external/<repo>/` by repository name, and expose the URLs as `externalUrls` in the target snapshot. It SHALL reject non-array content, empty URLs, unknown fields, refs that are not tag or commit names and paths that are absolute, contain `.` or `..` segments or use characters other than letters, digits, `.`, `_`, `+` and `-`, naming the file and entry. The directory name SHALL be the last URL path segment without `.git`, after the host of an SSH scp URL. The core SHALL export `parseExternalSources`, `externalRepoName` and `ExternalSource` so the preparation command uses the same rules.

#### Scenario: Pinned partial entry in a target
- **WHEN** a target's `external.json` contains `{ "url": "https://github.com/nuckty/nuckty.git", "ref": "v1.0.0", "path": "docs" }`
- **THEN** build stages resolve the repository at `external/nuckty/`
- **AND** an entry with an unknown field fails the build with the file and entry number

### Requirement: External directory is a protected input
The output preflight SHALL treat `external/` as a protected input whether or not `external.json` exists, and SHALL reject an `outDir` inside it before the clean stage.

#### Scenario: Output inside external
- **WHEN** a target sets `outDir` to `external/site` and the project has no `external.json`
- **THEN** the build fails before deleting anything
